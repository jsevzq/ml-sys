import { useOrdersControllerSummary } from '@/api/generated/orders/orders';
import type { OrdersControllerSummaryParams } from '@/api/generated/models';

/** Agregados de ventas para el dashboard. Los calcula el backend con las mismas
 *  reglas de liquidación que la tabla de /sales, así que no pueden divergir. */
export const useSalesSummary = (params: OrdersControllerSummaryParams = {}) =>
  useOrdersControllerSummary(params);
