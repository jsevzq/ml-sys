import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useMlControllerSync } from '@/api/generated/ml/ml';
import { itemsQueryKey } from '@/features/items/api/useItems';
import { getApiErrorMessage } from '@/lib/api-error';

/**
 * Trae el catálogo desde Mercado Libre y lo persiste en nuestra BD (POST /ml/sync).
 *
 * Este hook es el ejemplo de referencia del patrón de mutación:
 *   1. el hook generado por Orval hace la llamada,
 *   2. onSuccess invalida las queries afectadas,
 *   3. react-query refetchea solo lo invalidado y todos los componentes que
 *      consumen esa query se re-renderizan con los datos nuevos.
 *
 * Nadie tiene que pasar callbacks ni levantar el estado: la lista de items se
 * actualiza sola porque comparte la clave de caché que acá invalidamos.
 */
export const useSyncItems = () => {
  const queryClient = useQueryClient();

  return useMlControllerSync({
    mutation: {
      onSuccess: (result) => {
        queryClient.invalidateQueries({ queryKey: itemsQueryKey() });

        const fallidos = result.notSaved.length;
        toast.success(
          fallidos === 0
            ? `${result.saved} publicaciones sincronizadas`
            : `${result.saved} sincronizadas, ${fallidos} con error`,
        );
      },
      onError: (error) => {
        toast.error(
          getApiErrorMessage(error, 'No se pudo sincronizar con Mercado Libre'),
        );
      },
    },
  });
};
