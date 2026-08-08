import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ImportationProduct } from './entities/importation-product.entity';
import { Item } from '../items/entities/item.entity';
import { SkuEquivalence } from '../items/entities/sku-equivalence.entity';
import { StockAllocationService } from './stock-allocation.service';
import { buildMap, resolveSku } from '../items/lib/sku-equivalence';
import { variantLabel } from '../items/lib/variant-label';
import {
  ConsistencyReportDto,
  InconsistencyDto,
  InconsistencyKind,
} from './dto/consistency.dto';

const key = (mlItemId: string, mlVariationId: string | null): string =>
  mlVariationId ? `v:${mlVariationId}` : `i:${mlItemId}`;

/**
 * Cruce del stock que dicen los lotes contra el que dice Mercado Libre.
 *
 * Recorre la línea de tiempo completa —llegadas, ventas y subsanaciones, en
 * orden— manteniendo el saldo de cada SKU, y marca dos cosas distintas:
 *
 * - **Saldo negativo en el camino**: se vendió algo que a esa altura no había.
 *   Puede ser un swap sin registrar, una fecha de arribo posterior a la llegada
 *   real, o una importación que falta cargar.
 * - **Saldo final distinto del de ML**: sobra o falta mercadería hoy. Sobra
 *   cuando salió sin venderse (rotura, consumo propio); falta cuando ML tiene
 *   stock que nunca se importó, o cuando el stock de ML quedó sin actualizar.
 *
 * Una subsanación cargada hace desaparecer su discrepancia sola, porque entra al
 * mismo cálculo. No hay que marcarla como resuelta a mano.
 */
@Injectable()
export class ConsistencyService {
  constructor(
    @InjectRepository(ImportationProduct)
    private readonly productRepository: Repository<ImportationProduct>,
    @InjectRepository(Item)
    private readonly itemRepository: Repository<Item>,
    @InjectRepository(SkuEquivalence)
    private readonly equivalenceRepository: Repository<SkuEquivalence>,
    private readonly stockAllocation: StockAllocationService,
  ) {}

  async detect(mlUserId: string): Promise<ConsistencyReportDto> {
    const equivalences = buildMap(
      await this.equivalenceRepository.findBy({ mlUser: { id: mlUserId } }),
    );
    const catalogo = await this.catalogo(mlUserId, equivalences);
    const { lots, sales, consumptions } =
      await this.stockAllocation.buildTimeline(mlUserId);

    const findings: InconsistencyDto[] = [];

    // --- Saldo negativo en el camino ---------------------------------------
    type Event = {
      date: Date;
      priority: number;
      sku: string;
      delta: number;
    };
    const events: Event[] = [
      ...lots.flatMap((lot) => {
        const sku = lot.variationId
          ? `v:${lot.variationId}`
          : lot.itemId
            ? `i:${lot.itemId}`
            : null;
        return sku
          ? [
              {
                date: lot.arrivalDate,
                priority: 0,
                sku,
                delta: lot.quantity,
              },
            ]
          : [];
      }),
      ...sales.map((sale) => ({
        date: sale.soldAt,
        priority: 1,
        sku: key(sale.mlItemId, sale.mlVariationId),
        delta: -sale.quantity,
      })),
      ...consumptions.flatMap((consumption) => {
        const lot = lots.find((l) => l.id === consumption.importationProductId);
        const sku = lot?.variationId
          ? `v:${lot.variationId}`
          : lot?.itemId
            ? `i:${lot.itemId}`
            : null;
        return sku
          ? [
              {
                date: consumption.date,
                priority: 1,
                sku,
                delta: -consumption.quantity,
              },
            ]
          : [];
      }),
    ].sort(
      (a, b) => a.date.getTime() - b.date.getTime() || a.priority - b.priority,
    );

    const balance = new Map<string, number>();
    const alreadyReported = new Set<string>();

    for (const event of events) {
      const replacement = (balance.get(event.sku) ?? 0) + event.delta;
      balance.set(event.sku, replacement);

      if (replacement < 0 && !alreadyReported.has(event.sku)) {
        alreadyReported.add(event.sku);
        findings.push({
          type: InconsistencyKind.SALE_WITHOUT_STOCK,
          ...(catalogo.get(event.sku) ?? { title: null, variantName: null }),
          mlItemId: event.sku.startsWith('i:') ? event.sku.slice(2) : null,
          mlVariationId: event.sku.startsWith('v:') ? event.sku.slice(2) : null,
          units: -replacement,
          systemStock: null,
          mlStock: null,
          occurredAt: event.date.toISOString(),
          detail:
            'Se vendieron más unidades de las que habían llegado a esa fecha. ' +
            'Puede ser un swap sin registrar, una fecha de arribo posterior a la ' +
            'llegada real, o una importación sin cargar.',
        });
      }
    }

    // --- Saldo final contra el de ML ---------------------------------------
    const inLots = new Map<string, number>();
    const lines = await this.productRepository.find({
      where: { importation: { mlUser: { id: mlUserId } } },
      relations: { item: true, variation: true },
    });

    for (const line of lines) {
      const sku = line.variation
        ? `v:${line.variation.id}`
        : line.item
          ? `i:${line.item.id}`
          : null;
      if (!sku) continue;
      const restante =
        line.quantity - line.quantitySold - line.quantityAdjusted;
      inLots.set(sku, (inLots.get(sku) ?? 0) + restante);
    }

    for (const [sku, data] of catalogo) {
      const sistema = inLots.get(sku) ?? 0;
      if (sistema === data.mlStock) continue;

      const sobra = sistema > data.mlStock;
      findings.push({
        type: sobra
          ? InconsistencyKind.SURPLUS_IN_LOTS
          : InconsistencyKind.MISSING_IN_LOTS,
        title: data.title,
        variantName: data.variantName,
        mlItemId: sku.startsWith('i:') ? sku.slice(2) : data.mlItemId,
        mlVariationId: sku.startsWith('v:') ? sku.slice(2) : null,
        units: Math.abs(sistema - data.mlStock),
        systemStock: sistema,
        mlStock: data.mlStock,
        occurredAt: null,
        detail: sobra
          ? 'Los lotes tienen unidades que Mercado Libre ya no cuenta: salieron ' +
            'sin venderse, o el stock de ML quedó desactualizado.'
          : 'Mercado Libre tiene stock que no salió de ningún lote: falta cargar ' +
            'una importación, o la unidad llegó como otro producto.',
      });
    }

    return {
      inconsistencies: findings,
      total: findings.length,
      units: findings.reduce((total, hallazgo) => total + hallazgo.units, 0),
    };
  }

  /** SKUs del catálogo con su stock, ya traducidos por las equivalencias. */
  private async catalogo(
    mlUserId: string,
    equivalences: ReturnType<typeof buildMap>,
  ): Promise<
    Map<
      string,
      {
        title: string;
        variantName: string | null;
        mlItemId: string;
        mlStock: number;
      }
    >
  > {
    const items = await this.itemRepository.find({
      where: { mlUser: { id: mlUserId } },
      relations: { variations: { attributeOptions: { attribute: true } } },
    });

    const catalogo = new Map<
      string,
      {
        title: string;
        variantName: string | null;
        mlItemId: string;
        mlStock: number;
      }
    >();

    for (const item of items) {
      const variaciones = item.variations ?? [];

      if (variaciones.length === 0) {
        const sku = resolveSku(
          { mlItemId: item.id, mlVariationId: null },
          equivalences,
        );
        acumular(catalogo, key(sku.mlItemId, sku.mlVariationId), {
          title: item.title,
          variantName: null,
          mlItemId: item.id,
          mlStock: item.availableQuantity,
        });
        continue;
      }

      for (const variation of variaciones) {
        const sku = resolveSku(
          { mlItemId: item.id, mlVariationId: String(variation.id) },
          equivalences,
        );
        acumular(catalogo, key(sku.mlItemId, sku.mlVariationId), {
          title: item.title,
          variantName: variantLabel(variation.attributeOptions),
          mlItemId: item.id,
          mlStock: variation.availableQuantity,
        });
      }
    }

    return catalogo;
  }
}

/** Dos SKUs que apuntan al mismo destino suman su stock en él. */
function acumular<T extends { mlStock: number; variantName: string | null }>(
  mapa: Map<string, T>,
  ownKey: string,
  value: T,
): void {
  const previo = mapa.get(ownKey);
  if (!previo) {
    mapa.set(ownKey, value);
    return;
  }
  previo.mlStock += value.mlStock;
  previo.variantName ??= value.variantName;
}
