import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Not, Repository } from 'typeorm';
import { ImportationProduct } from './entities/importation-product.entity';
import {
  AllocationSource,
  SaleAllocation,
} from './entities/sale-allocation.entity';
import { Order } from '../orders/entities/order.entity';
import { Item } from '../items/entities/item.entity';
import {
  allocateFifo,
  type LineConsumption,
  type ImportationLot,
  type SaleToAllocate,
} from './lib/fifo';
import { Adjustment, AdjustmentKind } from './entities/adjustment.entity';
import { SkuEquivalence } from '../items/entities/sku-equivalence.entity';
import {
  buildMap,
  resolveSku,
  type MapaDeEquivalencias,
} from '../items/lib/sku-equivalence';

/** Una venta anulada no consumió stock. */
const OUT_OF_STOCK_STATUSES = ['cancelled', 'invalid'];

export interface RecalculationResult {
  allocations: number;
  allocatedUnits: number;
  unitsWithoutLot: number;
  /** Unidades vendidas antes de los 12 meses que expone la API de órdenes de ML. */
  historicalUnits: number;
  /** Unidades que salieron de un lote por una subsanación en vez de venderse. */
  adjustedUnits: number;
  /** Subsanaciones que pidieron más unidades de las que su línea tenía. */
  unbalancedAdjustments: number;
}

@Injectable()
export class StockAllocationService {
  private readonly logger = new Logger(StockAllocationService.name);

  constructor(
    @InjectRepository(ImportationProduct)
    private readonly productRepository: Repository<ImportationProduct>,
    @InjectRepository(SaleAllocation)
    private readonly allocationRepository: Repository<SaleAllocation>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(Item)
    private readonly itemRepository: Repository<Item>,
    @InjectRepository(Adjustment)
    private readonly adjustmentRepository: Repository<Adjustment>,
    @InjectRepository(SkuEquivalence)
    private readonly equivalenceRepository: Repository<SkuEquivalence>,
  ) {}

  /**
   * Reconstruye desde cero la atribución de ventas a lotes de una cuenta.
   *
   * Se borra todo y se vuelve a calcular a propósito: las importaciones se cargan
   * retroactivamente y con datos corregidos, así que un ledger incremental quedaría
   * mal apenas alguien edita una fecha de llegada. Al ser determinístico, correrlo
   * después de cada sincronización de ventas no descuenta stock dos veces.
   */
  async recalculate(mlUserId: string): Promise<RecalculationResult> {
    const equivalences = buildMap(
      await this.equivalenceRepository.findBy({ mlUser: { id: mlUserId } }),
    );
    const adjustments = await this.adjustmentRepository.find({
      where: { mlUser: { id: mlUserId } },
      relations: {
        importationProduct: true,
        orderItem: true,
        targetItem: true,
        targetVariation: true,
      },
    });

    const [lots, { paraFifo: sales, segunMl }] = await Promise.all([
      this.loadLots(mlUserId),
      this.loadSales(mlUserId, equivalences, adjustments),
    ]);

    // El hueco histórico se mide contra las ventas **como las contó ML**: un swap
    // cambia de qué lote salió la unidad, no bajo qué publicación se vendió. Si se
    // midiera contra las ventas ya reasignadas, cada swap inventaría una venta
    // histórica que no existió.
    const historicas = await this.deductHistoricalSales(mlUserId, segunMl);
    const all = [...historicas, ...sales];

    const {
      allocations,
      soldByLot,
      adjustedByLot,
      unallocated,
      unbalancedConsumptions,
    } = allocateFifo(lots, all, this.lineConsumptions(adjustments));

    await this.allocationRepository.manager.transaction(async (manager) => {
      await manager.delete(SaleAllocation, { mlUser: { id: mlUserId } });

      if (allocations.length) {
        await manager.insert(
          SaleAllocation,
          allocations.map((attribution) => ({
            mlUser: { id: mlUserId },
            orderItem: attribution.orderItemId
              ? { id: attribution.orderItemId }
              : null,
            source: attribution.historica
              ? AllocationSource.HISTORICAL
              : AllocationSource.ORDER,
            mlItemId: attribution.mlItemId,
            mlVariationId: attribution.mlVariationId,
            importationProduct: { id: attribution.importationProductId },
            quantity: attribution.quantity,
            soldAt: attribution.soldAt,
          })),
        );
      }

      // `quantitySold` y `quantityAdjusted` quedan como copia materializada del
      // cálculo: nunca se decrementan a mano, siempre se reescriben enteras.
      for (const lot of lots) {
        await manager.update(ImportationProduct, lot.id, {
          quantitySold: soldByLot.get(lot.id) ?? 0,
          quantityAdjusted: adjustedByLot.get(lot.id) ?? 0,
        });
      }
    });

    const allocatedUnits = allocations.reduce(
      (total, attribution) => total + attribution.quantity,
      0,
    );
    const unitsWithoutLot = unallocated.reduce(
      (total, resto) => total + resto.quantity,
      0,
    );
    const historicalUnits = historicas.reduce(
      (total, sale) => total + sale.quantity,
      0,
    );
    const adjustedUnits = [...adjustedByLot.values()].reduce(
      (total, units) => total + units,
      0,
    );

    this.logger.log(
      `Atribución recalculada para ${mlUserId}: ${allocations.length} asignaciones, ` +
        `${allocatedUnits} unidades con lote, ${unitsWithoutLot} sin lote, ` +
        `${historicalUnits} anteriores al historial de ML, ` +
        `${adjustedUnits} por adjustments`,
    );

    return {
      allocations: allocations.length,
      allocatedUnits,
      unitsWithoutLot,
      historicalUnits,
      adjustedUnits,
      unbalancedAdjustments: unbalancedConsumptions.length,
    };
  }

  /**
   * Los mismos eventos que consume el FIFO, para que el detector de
   * inconsistencias mire exactamente lo que mira el motor. Duplicar el armado
   * sería garantizar que en algún momento digan cosas distintas.
   */
  async buildTimeline(mlUserId: string): Promise<{
    lots: ImportationLot[];
    sales: SaleToAllocate[];
    consumptions: LineConsumption[];
  }> {
    const equivalences = buildMap(
      await this.equivalenceRepository.findBy({ mlUser: { id: mlUserId } }),
    );
    const adjustments = await this.adjustmentRepository.find({
      where: { mlUser: { id: mlUserId } },
      relations: {
        importationProduct: true,
        orderItem: true,
        targetItem: true,
        targetVariation: true,
      },
    });

    const [lots, { paraFifo, segunMl }] = await Promise.all([
      this.loadLots(mlUserId),
      this.loadSales(mlUserId, equivalences, adjustments),
    ]);

    const historicas = await this.deductHistoricalSales(mlUserId, segunMl);

    return {
      lots,
      sales: [...historicas, ...paraFifo],
      consumptions: this.lineConsumptions(adjustments),
    };
  }

  /** Lo mismo que devuelve `recalculate`, pero leído de lo ya calculado. */
  async summary(mlUserId: string): Promise<RecalculationResult> {
    const allocations = await this.allocationRepository.find({
      where: { mlUser: { id: mlUserId } },
      select: { id: true, quantity: true, source: true },
    });

    const units = (source: AllocationSource) =>
      allocations
        .filter((allocation) => allocation.source === source)
        .reduce((total, allocation) => total + allocation.quantity, 0);

    const adjusted = await this.productRepository.sum('quantityAdjusted', {
      importation: { mlUser: { id: mlUserId } },
    });

    return {
      allocations: allocations.length,
      allocatedUnits: allocations.reduce((t, a) => t + a.quantity, 0),
      // Recalcular es la única forma de saber cuánto quedó sin lote y cuántas
      // subsanaciones se quedaron sin saldo: son resultados del cálculo, no del
      // ledger, así que no se pueden leer de lo ya guardado.
      unitsWithoutLot: 0,
      historicalUnits: units(AllocationSource.HISTORICAL),
      adjustedUnits: adjusted ?? 0,
      unbalancedAdjustments: 0,
    };
  }

  private async loadLots(mlUserId: string): Promise<ImportationLot[]> {
    const products = await this.productRepository.find({
      where: { importation: { mlUser: { id: mlUserId } } },
      relations: { importation: true, item: true, variation: true },
    });

    return products.map((product) => ({
      id: product.id,
      itemId: product.item?.id ?? null,
      variationId: product.variation?.id ?? null,
      arrivalDate: product.importation.arrivalDate,
      quantity: product.quantity,
      importationId: product.importation.id,
    }));
  }

  /**
   * Destrucciones y mutaciones: la unidad sale de una línea concreta, que el
   * usuario eligió. No buscan lote, pero entran en la línea de tiempo igual que
   * una venta porque consumir en marzo cambia de qué lote sale la venta de abril.
   */
  private lineConsumptions(adjustments: Adjustment[]): LineConsumption[] {
    return adjustments
      .filter(
        (adjustment) =>
          adjustment.type !== AdjustmentKind.SWAP &&
          adjustment.importationProduct !== null,
      )
      .map((adjustment) => ({
        adjustmentId: adjustment.id,
        importationProductId: adjustment.importationProduct!.id,
        quantity: adjustment.quantity,
        date: adjustment.occurredAt ?? adjustment.createdAt,
      }));
  }

  private async loadSales(
    mlUserId: string,
    equivalences: MapaDeEquivalencias,
    adjustments: Adjustment[],
  ): Promise<{ paraFifo: SaleToAllocate[]; segunMl: SaleToAllocate[] }> {
    const orders = await this.orderRepository.find({
      where: {
        mlUser: { id: mlUserId },
        status: Not(In(OUT_OF_STOCK_STATUSES)),
      },
      relations: { items: true },
    });

    // Un swap no cambia la venta: cambia de qué lote salió la unidad. La línea se
    // parte en dos, con la misma orden y la misma fecha, y la parte despachada
    // busca su lote contra el producto que realmente se mandó.
    const swaps = new Map<number, Adjustment>();
    for (const adjustment of adjustments) {
      if (adjustment.type === AdjustmentKind.SWAP && adjustment.orderItem) {
        swaps.set(adjustment.orderItem.id, adjustment);
      }
    }

    const paraFifo: SaleToAllocate[] = [];
    const segunMl: SaleToAllocate[] = [];

    for (const order of orders) {
      for (const line of order.items ?? []) {
        const soldAt = order.dateClosed ?? order.dateCreated;
        const sku = resolveSku(
          { mlItemId: line.mlItemId, mlVariationId: line.mlVariationId },
          equivalences,
        );

        segunMl.push({
          orderItemId: line.id,
          mlItemId: sku.mlItemId,
          mlVariationId: sku.mlVariationId,
          quantity: line.quantity,
          soldAt,
          order: line.id,
        });

        const swap = swaps.get(line.id);
        const despachadas = swap ? Math.min(swap.quantity, line.quantity) : 0;

        if (despachadas > 0 && swap?.targetItem) {
          paraFifo.push({
            orderItemId: line.id,
            mlItemId: swap.targetItem.id,
            mlVariationId: swap.targetVariation?.id ?? null,
            quantity: despachadas,
            soldAt,
            order: line.id,
          });
        }

        const asSold = line.quantity - despachadas;
        if (asSold > 0) {
          paraFifo.push({
            orderItemId: line.id,
            mlItemId: sku.mlItemId,
            mlVariationId: sku.mlVariationId,
            quantity: asSold,
            soldAt,
            order: line.id,
          });
        }
      }
    }

    return { paraFifo, segunMl };
  }

  /**
   * Ventas que existieron pero que no podemos traer.
   *
   * `GET /orders/search` de Mercado Libre sólo devuelve los últimos 12 meses: recorta
   * el rango en silencio, sin error. El catálogo, en cambio, trae `soldQuantity` con
   * el acumulado histórico de cada publicación y de cada variante. La diferencia entre
   * los dos son unidades que se vendieron antes de esa ventana.
   *
   * Sin esto, un lote que llegó hace dos años figuraría casi entero en stock. La fecha
   * exacta de esas ventas no se puede saber, así que se las ubica justo antes de la
   * venta más vieja que sí tenemos: es lo único que sabemos con certeza de ellas.
   */
  private async deductHistoricalSales(
    mlUserId: string,
    conocidas: SaleToAllocate[],
  ): Promise<SaleToAllocate[]> {
    const items = await this.itemRepository.find({
      where: { mlUser: { id: mlUserId } },
      relations: { variations: true },
    });

    const knownSold = new Map<string, number>();
    for (const sale of conocidas) {
      const key = sale.mlVariationId
        ? `v:${sale.mlVariationId}`
        : `i:${sale.mlItemId}`;
      knownSold.set(key, (knownSold.get(key) ?? 0) + sale.quantity);
    }

    const masVieja = conocidas.reduce<Date | null>(
      (minima, sale) =>
        !minima || sale.soldAt < minima ? sale.soldAt : minima,
      null,
    );
    // Un segundo antes de la venta más vieja: siempre primeras en el FIFO.
    const date = masVieja ? new Date(masVieja.getTime() - 1000) : new Date(0);

    const historicas: SaleToAllocate[] = [];
    let secuencia = 0;

    for (const item of items) {
      const variaciones = item.variations ?? [];

      if (variaciones.length === 0) {
        const faltan = item.soldQuantity - (knownSold.get(`i:${item.id}`) ?? 0);
        if (faltan > 0) {
          historicas.push({
            orderItemId: null,
            mlItemId: item.id,
            mlVariationId: null,
            quantity: faltan,
            soldAt: date,
            order: --secuencia,
            historica: true,
          });
        }
        continue;
      }

      for (const variation of variaciones) {
        const faltan =
          variation.soldQuantity - (knownSold.get(`v:${variation.id}`) ?? 0);
        if (faltan > 0) {
          historicas.push({
            orderItemId: null,
            mlItemId: item.id,
            mlVariationId: variation.id,
            quantity: faltan,
            soldAt: date,
            order: --secuencia,
            historica: true,
          });
        }
      }
    }

    return historicas;
  }
}
