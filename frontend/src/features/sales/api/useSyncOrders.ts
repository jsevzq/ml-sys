import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useOrdersControllerSync } from '@/api/generated/orders/orders';
import { getApiErrorMessage } from '@/lib/api-error';

/**
 * Trae las ventas de Mercado Libre y las persiste (POST /orders/sync).
 *
 * El timeout va muy por encima del default de 10 s: la primera corrida hace el
 * backfill completo (todas las ventas más una llamada por envío) y tarda minutos.
 * Las siguientes son incrementales y terminan en menos de un segundo.
 */
export const useSyncOrders = () => {
  const queryClient = useQueryClient();

  return useOrdersControllerSync({
    request: { timeout: 15 * 60 * 1000 },
    mutation: {
      onSuccess: (result) => {
        queryClient.invalidateQueries({ queryKey: ['/orders'] });

        const fallidas = result.notSaved.length;
        toast.success(
          fallidas === 0
            ? `${result.saved} ventas sincronizadas`
            : `${result.saved} sincronizadas, ${fallidas} con error`,
        );
      },
      onError: (error) => {
        toast.error(
          getApiErrorMessage(error, 'No se pudieron sincronizar las ventas'),
        );
      },
    },
  });
};
