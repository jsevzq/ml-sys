import {
  useOrdersControllerFindAll,
  getOrdersControllerFindAllQueryKey,
} from '@/api/generated/orders/orders';
import type { OrdersControllerFindAllParams } from '@/api/generated/models';

/** Ventas sincronizadas desde Mercado Libre, paginadas del lado del servidor. */
export const useOrders = (params: OrdersControllerFindAllParams) =>
  useOrdersControllerFindAll(params);

/** Clave de caché del listado. Se invalida al sincronizar. */
export const ordersQueryKey = getOrdersControllerFindAllQueryKey;
