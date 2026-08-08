/**
 * Atribución FIFO de ventas a lotes de importación.
 *
 * Regla: cuando se vende un producto, la unidad sale del lote más viejo que ya había
 * llegado al momento de la venta. Si dos importaciones traen el mismo producto, la
 * primera se consume antes que la segunda.
 *
 * El matcheo es **estricto**: la venta de una variación sólo consume lotes cargados
 * contra esa misma variación, y la de una publicación sin variantes sólo consume lotes
 * cargados contra esa publicación. Lo que no encuentra lote queda "sin atribuir" — es
 * stock anterior al sistema o un lote que todavía no se cargó.
 *
 * La función es pura y total: mismas entradas, mismas salidas. Eso es lo que hace que
 * recalcular después de cada sincronización de ventas sea inofensivo, en vez de ir
 * restando de un contador que se desincroniza con cada refresh.
 */

export interface ImportationLot {
  /** id de `ImportationProduct` */
  id: number;
  itemId: string | null;
  variationId: string | null;
  /** Un lote no puede haber surtido una venta anterior a su llegada. */
  arrivalDate: Date;
  quantity: number;
  /** Desempate cuando dos lotes llegaron el mismo día. */
  importationId: number;
}

export interface SaleToAllocate {
  /** id de `OrderItem`, o null si es una venta anterior al historial de ML. */
  orderItemId: number | null;
  mlItemId: string;
  mlVariationId: string | null;
  quantity: number;
  soldAt: Date;
  /** Para desempatar y para dejar constancia de de dónde salió la unidad. */
  order: number;
  historica?: boolean;
}

/**
 * Salida de una línea que no fue una venta: una destrucción, o el origen de una
 * mutación. No busca lote —ya sabe cuál—, pero entra en la línea de tiempo igual
 * que una venta, porque consumir una unidad en marzo cambia de qué lote sale la
 * venta de abril.
 */
export interface LineConsumption {
  adjustmentId: number;
  importationProductId: number;
  quantity: number;
  date: Date;
}

export interface Attribution {
  orderItemId: number | null;
  mlItemId: string;
  mlVariationId: string | null;
  importationProductId: number;
  quantity: number;
  soldAt: Date;
  historica: boolean;
}

export interface Unallocated {
  orderItemId: number | null;
  quantity: number;
}

/** Una subsanación que pidió más unidades de las que a esa altura quedaban en su línea. */
export interface UnbalancedConsumption {
  adjustmentId: number;
  importationProductId: number;
  quantity: number;
}

export interface FifoResult {
  allocations: Attribution[];
  /** Unidades consumidas por cada lote, para materializar `quantitySold`. */
  soldByLot: Map<number, number>;
  /** Ídem para `quantityAdjusted`: lo que se llevaron las subsanaciones. */
  adjustedByLot: Map<number, number>;
  unallocated: Unallocated[];
  unbalancedConsumptions: UnbalancedConsumption[];
}

/** Una venta de variación y un lote de variación se encuentran sólo si es la misma. */
const saleKey = (sale: SaleToAllocate): string =>
  sale.mlVariationId ? `v:${sale.mlVariationId}` : `i:${sale.mlItemId}`;

const lotKey = (lot: ImportationLot): string | null => {
  if (lot.variationId) return `v:${lot.variationId}`;
  if (lot.itemId) return `i:${lot.itemId}`;
  return null;
};

export function allocateFifo(
  lots: ImportationLot[],
  sales: SaleToAllocate[],
  consumptions: LineConsumption[] = [],
): FifoResult {
  const disponibles = new Map<
    string,
    { lot: ImportationLot; balance: number }[]
  >();
  const porId = new Map<number, { lot: ImportationLot; balance: number }>();

  const sorted = [...lots].sort(
    (a, b) =>
      a.arrivalDate.getTime() - b.arrivalDate.getTime() ||
      a.importationId - b.importationId ||
      a.id - b.id,
  );

  for (const lot of sorted) {
    const key = lotKey(lot);
    if (!key) continue;
    const entry = { lot, balance: lot.quantity };
    const cola = disponibles.get(key) ?? [];
    cola.push(entry);
    disponibles.set(key, cola);
    porId.set(lot.id, entry);
  }

  const allocations: Attribution[] = [];
  const soldByLot = new Map<number, number>();
  const adjustedByLot = new Map<number, number>();
  const unallocated: Unallocated[] = [];
  const unbalancedConsumptions: UnbalancedConsumption[] = [];

  // Ventas y subsanaciones comparten una sola línea de tiempo. Ante empate la
  // subsanación va primero: si el mismo día se rompió una unidad y se vendió otra,
  // la rota ya no estaba para venderse.
  type Evento =
    | { date: Date; priority: 0; consumption: LineConsumption }
    | { date: Date; priority: 1; sale: SaleToAllocate };

  const eventos: Evento[] = [
    ...consumptions.map((consumption): Evento => ({
      date: consumption.date,
      priority: 0,
      consumption,
    })),
    ...sales.map((sale): Evento => ({ date: sale.soldAt, priority: 1, sale })),
  ].sort(
    (a, b) =>
      a.date.getTime() - b.date.getTime() ||
      a.priority - b.priority ||
      ('sale' in a && 'sale' in b ? a.sale.order - b.sale.order : 0),
  );

  for (const evento of eventos) {
    if ('consumption' in evento) {
      const { consumption } = evento;
      const entry = porId.get(consumption.importationProductId);
      const tomado = Math.min(entry?.balance ?? 0, consumption.quantity);

      if (entry && tomado > 0) {
        entry.balance -= tomado;
        adjustedByLot.set(
          entry.lot.id,
          (adjustedByLot.get(entry.lot.id) ?? 0) + tomado,
        );
      }
      if (tomado < consumption.quantity) {
        unbalancedConsumptions.push({
          adjustmentId: consumption.adjustmentId,
          importationProductId: consumption.importationProductId,
          quantity: consumption.quantity - tomado,
        });
      }
      continue;
    }

    const { sale } = evento;
    let pendiente = sale.quantity;
    const cola = disponibles.get(saleKey(sale)) ?? [];

    for (const candidate of cola) {
      if (pendiente === 0) break;
      if (candidate.balance === 0) continue;
      if (candidate.lot.arrivalDate > sale.soldAt) continue;

      const consumed = Math.min(candidate.balance, pendiente);
      candidate.balance -= consumed;
      pendiente -= consumed;

      allocations.push({
        orderItemId: sale.orderItemId,
        mlItemId: sale.mlItemId,
        mlVariationId: sale.mlVariationId,
        importationProductId: candidate.lot.id,
        quantity: consumed,
        soldAt: sale.soldAt,
        historica: sale.historica ?? false,
      });
      soldByLot.set(
        candidate.lot.id,
        (soldByLot.get(candidate.lot.id) ?? 0) + consumed,
      );
    }

    if (pendiente > 0) {
      unallocated.push({ orderItemId: sale.orderItemId, quantity: pendiente });
    }
  }

  return {
    allocations,
    soldByLot,
    adjustedByLot,
    unallocated,
    unbalancedConsumptions,
  };
}
