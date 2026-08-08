/**
 * Cómo liquida Mercado Libre una venta.
 *
 * Las reglas salen de cruzar el reporte oficial de ventas (columna "Total (UYU)")
 * contra la API, venta por venta:
 *
 *   Total = Ingresos por productos
 *         − Cargo por venta − Costo fijo        → `saleFee` de la API ya suma los dos
 *         + Ingresos por envío − Costos de envío → depende del tipo de logística
 *         + Descuentos y bonificaciones
 *         + Anulaciones y reembolsos             → la cancelación deja la venta en 0
 */

export type SaleStatus = string;

interface SettleableLine {
  saleFee: number | string | null;
  quantity: number;
}

interface SettleableShipment {
  logisticType?: string | null;
  senderCost?: number | string | null;
  receiverCost?: number | string | null;
  senderDiscount?: number | string | null;
  orders?: unknown[];
}

interface SettleableSale {
  status: SaleStatus;
  totalAmount: number | string;
  items?: SettleableLine[];
  shipment?: SettleableShipment | null;
}

/** Mercado Envíos Flex: la entrega la hace el vendedor, así que el envío lo cobra él. */
const FLEX = 'self_service';

/** Estados en los que ML revierte todos los cargos y la venta queda en cero. */
const ANULADAS = new Set(['cancelled', 'invalid']);

const toNumber = (value: number | string | null | undefined): number => {
  if (value === null || value === undefined) return 0;
  const convertido = Number(value);
  return Number.isFinite(convertido) ? convertido : 0;
};

const round = (value: number): number => Math.round(value * 100) / 100;

/** Comisión total: ML cobra `saleFee` **por unidad**, no por línea. */
export function saleCommission(items: SettleableLine[] = []): number {
  return round(
    items.reduce(
      (total, line) => total + toNumber(line.saleFee) * line.quantity,
      0,
    ),
  );
}

/**
 * Impacto del envío en la liquidación. Positivo = lo cobrás, negativo = lo pagás.
 *
 * Con Flex el vendedor nunca paga el envío en la venta: cobra lo que puso el comprador
 * y, si el envío fue gratis, la bonificación de ML. Con el resto de las logísticas paga
 * lo que ML le descuenta (`senderCost` ya viene neto de lo que aportó el comprador).
 *
 * El envío es del pack: si varias ventas hermanas lo comparten, se prorratea para que
 * la suma de los netos no lo cuente más de una vez.
 */
export function shippingBalanceOf(
  shipment?: SettleableShipment | null,
): number {
  if (!shipment) return 0;

  const hermanas = shipment.orders?.length ?? 1;
  const proration = hermanas > 0 ? hermanas : 1;

  if (shipment.logisticType === FLEX) {
    const buyerPaid = toNumber(shipment.receiverCost);
    const credited =
      buyerPaid > 0 ? buyerPaid : toNumber(shipment.senderDiscount);
    return round(credited / proration);
  }

  return round(-toNumber(shipment.senderCost) / proration);
}

/** Lo que ML te deposita por la venta. */
export function saleNet(sale: SettleableSale): number {
  if (ANULADAS.has(sale.status)) return 0;

  return round(
    toNumber(sale.totalAmount) -
      saleCommission(sale.items) +
      shippingBalanceOf(sale.shipment),
  );
}
