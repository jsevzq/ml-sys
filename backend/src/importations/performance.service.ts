import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Importation } from './entities/importation.entity';
import { SaleAllocation } from './entities/sale-allocation.entity';
import { Order } from '../orders/entities/order.entity';
import { calculateCosts } from './lib/landed-cost';
import { saleNet } from '../orders/lib/order-amounts';
import { variantLabel } from '../items/lib/variant-label';
import {
  LotPerformanceDto,
  MonthPerformanceDto,
  PerformanceReportDto,
  ProductPerformanceDto,
} from './dto/performance.dto';

const round = (value: number): number => Math.round(value * 100) / 100;
const DAY = 24 * 60 * 60 * 1000;

/**
 * Rentabilidad real del negocio.
 *
 * El dashboard de ventas llega hasta el neto que deposita Mercado Libre. Acá se
 * descuenta además **lo que costó la mercadería**, que es lo único que convierte
 * facturación en ganancia. El puente es `SaleAllocation`: cada unidad vendida
 * sabe de qué lote salió, y cada lote sabe cuánto costó puesta en depósito.
 *
 * **Cómo se reparte el neto entre unidades.** La comisión de ML ya viene por
 * unidad, pero el envío y los cupones son por orden. Cuando una orden se abastece
 * de dos lotes distintos hay que repartir: se hace **en partes iguales entre las
 * unidades de la orden**, que es lo defendible cuando lo que se reparte es un
 * costo de envío —una caja con dos unidades no cuesta el doble por la más cara—.
 */
@Injectable()
export class PerformanceService {
  constructor(
    @InjectRepository(Importation)
    private readonly importationRepository: Repository<Importation>,
    @InjectRepository(SaleAllocation)
    private readonly allocationRepository: Repository<SaleAllocation>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
  ) {}

  async report(mlUserId: string): Promise<PerformanceReportDto> {
    const [importations, allocations, orders] = await Promise.all([
      this.importationRepository.find({
        where: { mlUser: { id: mlUserId } },
        relations: {
          products: {
            item: true,
            variation: { item: true, attributeOptions: { attribute: true } },
            generatedBy: { importationProduct: true },
          },
          additionalCosts: { type: true },
        },
      }),
      this.allocationRepository.find({
        where: { mlUser: { id: mlUserId } },
        relations: { importationProduct: true, orderItem: true },
      }),
      this.orderRepository.find({
        where: { mlUser: { id: mlUserId } },
        relations: { items: true, shipment: { orders: true } },
      }),
    ]);

    const netPerUnit = this.netPerUnit(orders);
    const { unitCost, investedByLot, lineLot, lineLabel, restante } =
      this.costs(importations);

    const byLot = new Map<number, LotPerformanceDto>();
    const byMonth = new Map<string, MonthPerformanceDto>();
    const byProduct = new Map<string, ProductPerformanceDto>();

    let soldUnits = 0;
    let ingreso = 0;
    let costOfSold = 0;

    for (const allocation of allocations) {
      const line = allocation.importationProduct;
      const unitario = unitCost.get(line.id) ?? 0;
      const cost = round(unitario * allocation.quantity);
      // Una venta anterior al historial de ML no tiene orden: descontó stock pero
      // no sabemos por cuánto se vendió. Suma al costo y no al ingreso.
      const net = allocation.orderItem
        ? round(
            (netPerUnit.get(allocation.orderItem.id) ?? 0) *
              allocation.quantity,
          )
        : 0;

      soldUnits += allocation.quantity;
      ingreso += net;
      costOfSold += cost;

      const lot = lineLot.get(line.id);
      if (lot !== undefined) {
        accumulateLot(byLot, lot, allocation.quantity, net, cost);
      }

      const month = allocation.soldAt.toISOString().slice(0, 7);
      accumulateMonth(byMonth, month, allocation.quantity, net, cost);

      const key = lineLabel.get(line.id);
      if (key) {
        accumulateProduct(byProduct, key, allocation.quantity, net, cost);
      }
    }

    const lots = importations
      .map((importation) => {
        const acumulado = byLot.get(importation.id);
        const invested = investedByLot.get(importation.id) ?? 0;
        const purchasedLines = importation.products
          .filter((line) => !line.generatedBy)
          .reduce((total, line) => total + line.quantity, 0);
        const sold = acumulado?.units ?? 0;
        const addDays = Math.max(
          1,
          Math.round((Date.now() - importation.arrivalDate.getTime()) / DAY),
        );
        const byDay = sold / addDays;
        const restantes = purchasedLines - sold;

        return {
          id: importation.id,
          arrivalDate: importation.arrivalDate.toISOString(),
          invested: invested,
          units: purchasedLines,
          soldUnits: sold,
          revenue: round(acumulado?.revenue ?? 0),
          cogs: round(acumulado?.cogs ?? 0),
          grossProfit: round(
            (acumulado?.revenue ?? 0) - (acumulado?.cogs ?? 0),
          ),
          // Sobre lo invertido en el lote entero, no sobre lo ya vendido: es lo
          // que responde "¿este lote ya se pagó solo?".
          roi:
            invested > 0
              ? round((((acumulado?.revenue ?? 0) - invested) / invested) * 100)
              : 0,
          recoveredPct:
            invested > 0
              ? round(((acumulado?.revenue ?? 0) / invested) * 100)
              : 0,
          unitsPerDay: Math.round(byDay * 1000) / 1000,
          daysToSellOut:
            byDay > 0 && restantes > 0 ? Math.round(restantes / byDay) : null,
        };
      })
      .sort((a, b) => b.arrivalDate.localeCompare(a.arrivalDate));

    const invested = lots.reduce((total, lot) => total + lot.invested, 0);
    const enStock = [...unitCost.entries()].reduce(
      (total, [id, unitario]) => total + unitario * (restante.get(id) ?? 0),
      0,
    );

    return {
      revenue: round(ingreso),
      cogs: round(costOfSold),
      grossProfit: round(ingreso - costOfSold),
      marginPct:
        ingreso > 0 ? round(((ingreso - costOfSold) / ingreso) * 100) : 0,
      soldUnits: soldUnits,
      invested: round(invested),
      stockValue: round(enStock),
      roi: invested > 0 ? round(((ingreso - costOfSold) / invested) * 100) : 0,
      byMonth: [...byMonth.values()].sort((a, b) =>
        a.month.localeCompare(b.month),
      ),
      byProduct: [...byProduct.values()]
        .sort((a, b) => b.grossProfit - a.grossProfit)
        .slice(0, 20),
      byLot: lots,
    };
  }

  /**
   * Costo unitario puesto en depósito de cada línea, más los índices que hacen
   * falta para agrupar después. Se calcula lote por lote porque los adicionales
   * se prorratean dentro de su propia importación.
   */
  private costs(importations: Importation[]) {
    const unitCost = new Map<number, number>();
    const investedByLot = new Map<number, number>();
    const lineLot = new Map<number, number>();
    const restante = new Map<number, number>();
    const lineLabel = new Map<
      number,
      { key: string; title: string; variantName: string | null }
    >();

    for (const importation of importations) {
      const calculation = calculateCosts(
        importation.products.map((line) => ({
          id: line.id,
          quantity: line.quantity,
          price: line.price,
          exchangeToUYURate: line.exchangeToUYURate,
          generatedFromId: line.generatedBy?.importationProduct?.id ?? null,
        })),
        importation.additionalCosts.map((cost) => ({
          id: cost.id,
          kind: cost.kind,
          amount: cost.amount,
          exchangeToUYURate: cost.exchangeToUYURate,
        })),
      );

      investedByLot.set(importation.id, calculation.totalUYU);

      for (const line of importation.products) {
        unitCost.set(line.id, calculation.byLine.get(line.id)?.unitUYU ?? 0);
        lineLot.set(line.id, importation.id);
        restante.set(
          line.id,
          line.quantity - line.quantitySold - line.quantityAdjusted,
        );

        const item = line.item ?? line.variation?.item ?? null;
        if (!item) continue;
        lineLabel.set(line.id, {
          key: line.variation ? `v:${line.variation.id}` : `i:${item.id}`,
          title: item.title,
          variantName: variantLabel(line.variation?.attributeOptions),
        });
      }
    }

    return {
      unitCost,
      investedByLot,
      lineLot,
      lineLabel,
      restante,
    };
  }

  /** Lo que deja cada unidad de una orden, ya sin comisión y con el envío repartido. */
  private netPerUnit(orders: Order[]): Map<number, number> {
    const byUnit = new Map<number, number>();

    for (const order of orders) {
      const units = (order.items ?? []).reduce(
        (total, line) => total + line.quantity,
        0,
      );
      if (units === 0) continue;

      const net = saleNet(order);
      for (const line of order.items ?? []) {
        byUnit.set(line.id, net / units);
      }
    }

    return byUnit;
  }
}

function accumulateLot(
  mapa: Map<number, LotPerformanceDto>,
  lot: number,
  units: number,
  ingreso: number,
  cost: number,
): void {
  const previo =
    mapa.get(lot) ??
    ({ units: 0, revenue: 0, cogs: 0 } as unknown as LotPerformanceDto);
  previo.units += units;
  previo.revenue += ingreso;
  previo.cogs += cost;
  mapa.set(lot, previo);
}

function accumulateMonth(
  mapa: Map<string, MonthPerformanceDto>,
  month: string,
  units: number,
  ingreso: number,
  cost: number,
): void {
  const previo = mapa.get(month) ?? {
    month: month,
    units: 0,
    revenue: 0,
    cogs: 0,
    grossProfit: 0,
  };
  previo.units += units;
  previo.revenue = round(previo.revenue + ingreso);
  previo.cogs = round(previo.cogs + cost);
  previo.grossProfit = round(previo.revenue - previo.cogs);
  mapa.set(month, previo);
}

function accumulateProduct(
  mapa: Map<string, ProductPerformanceDto>,
  label: { key: string; title: string; variantName: string | null },
  units: number,
  ingreso: number,
  cost: number,
): void {
  const previo = mapa.get(label.key) ?? {
    sku: label.key.slice(2),
    title: label.title,
    variantName: label.variantName,
    units: 0,
    revenue: 0,
    cogs: 0,
    grossProfit: 0,
    marginPct: 0,
  };
  previo.units += units;
  previo.revenue = round(previo.revenue + ingreso);
  previo.cogs = round(previo.cogs + cost);
  previo.grossProfit = round(previo.revenue - previo.cogs);
  previo.marginPct =
    previo.revenue > 0 ? round((previo.grossProfit / previo.revenue) * 100) : 0;
  mapa.set(label.key, previo);
}
