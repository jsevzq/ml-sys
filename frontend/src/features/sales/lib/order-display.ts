import type { OrderDto } from '@/api/generated/models';

/**
 * Los importes de la liquidación (`commissionAmount`, `shippingBalance`, `netAmount`)
 * los calcula el backend, que es donde están las reglas de Mercado Libre verificadas
 * contra su reporte oficial. Acá sólo se etiquetan para mostrarlos.
 */

export function unitOrder(order: OrderDto) {
  return order.items.reduce((total, line) => total + line.quantity, 0);
}

/** Una venta cancelada no liquida nada: ML revierte todos los cargos. */
export function estaAnulada(order: OrderDto) {
  return order.status === 'cancelled' || order.status === 'invalid';
}

const STATUSES: Record<string, string> = {
  paid: 'Pagada',
  confirmed: 'Confirmada',
  cancelled: 'Cancelada',
  payment_required: 'Pago pendiente',
  payment_in_process: 'Pago en proceso',
  partially_paid: 'Pago parcial',
  invalid: 'Inválida',
};

export function statusLabel(status: string) {
  return STATUSES[status] ?? status;
}

/**
 * El estado de la venta, en las mismas insignias suaves que el resto del sistema.
 * La variante `default` pintaba de negro sólido las cincuenta filas de una página
 * —el estado normal era el que más tinta gastaba— y dejaba los pagos pendientes en
 * gris, indistinguibles de no tener estado.
 */
export function statusVariant(
  status: string,
): 'success' | 'warning' | 'destructive' | 'secondary' {
  if (status === 'cancelled' || status === 'invalid') return 'destructive';
  if (status === 'paid' || status === 'confirmed') return 'success';
  if (status.startsWith('payment') || status === 'partially_paid')
    return 'warning';
  return 'secondary';
}

const LOGISTICA: Record<string, string> = {
  self_service: 'Flex',
  xd_drop_off: 'Agencia',
  drop_off: 'Correo',
  cross_docking: 'Colecta',
  fulfillment: 'Full',
};

export function logisticaLabel(logisticType?: string) {
  if (!logisticType) return null;
  return LOGISTICA[logisticType] ?? logisticType.replace(/_/g, ' ');
}

/** Qué explica el número de la columna de envío, según quién lo terminó pagando. */
export function shippingTooltip(order: OrderDto) {
  const compartido = order.packId
    ? ' Se prorratea entre las ventas del mismo carrito, que comparten un solo envío.'
    : '';

  if (order.shippingBalance > 0) {
    return `Con Flex la entrega corre por cuenta del vendedor, por lo que Mercado Libre acredita el envío.${compartido}`;
  }
  if (order.shippingBalance < 0) {
    return `Costo del envío que descuenta Mercado Libre.${compartido}`;
  }
  return 'El envío no tuvo costo: lo abonó el comprador.';
}
