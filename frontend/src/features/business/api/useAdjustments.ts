import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  useAdjustmentsControllerCreate,
  useAdjustmentsControllerFindAll,
  useAdjustmentsControllerRemove,
  useAdjustmentsControllerUpdate,
} from '@/api/generated/adjustments/adjustments';
import { useConsistencyControllerDetect } from '@/api/generated/consistency/consistency';
import {
  useSkuEquivalencesControllerCreate,
  useSkuEquivalencesControllerFindAll,
  useSkuEquivalencesControllerRemove,
} from '@/api/generated/sku-equivalences/sku-equivalences';
import { getApiErrorMessage } from '@/lib/api-error';

/**
 * Una subsanación cambia la atribución de las ventas a los lotes, así que todo
 * lo que depende de ella queda viejo: los lotes, el reparto y el detector.
 */
const refrescarTodo = (queryClient: ReturnType<typeof useQueryClient>) => {
  for (const key of [
    '/adjustments',
    '/importations',
    '/consistency',
    '/sku-equivalences',
  ]) {
    queryClient.invalidateQueries({ queryKey: [key] });
  }
};

export const useAdjustments = () => useAdjustmentsControllerFindAll();
export const useConsistency = () => useConsistencyControllerDetect();
export const useSkuEquivalences = () => useSkuEquivalencesControllerFindAll();

export const useCreateAdjustment = () => {
  const queryClient = useQueryClient();

  return useAdjustmentsControllerCreate({
    mutation: {
      onSuccess: () => {
        refrescarTodo(queryClient);
        toast.success('Subsanación registrada');
      },
      onError: (error) =>
        toast.error(
          getApiErrorMessage(error, 'No se pudo registrar la subsanación'),
        ),
    },
  });
};

export const useUpdateAdjustment = () => {
  const queryClient = useQueryClient();

  return useAdjustmentsControllerUpdate({
    mutation: {
      onSuccess: () => {
        refrescarTodo(queryClient);
        toast.success('Subsanación actualizada');
      },
      onError: (error) =>
        toast.error(
          getApiErrorMessage(error, 'No se pudo actualizar la subsanación'),
        ),
    },
  });
};

export const useDeleteAdjustment = () => {
  const queryClient = useQueryClient();

  return useAdjustmentsControllerRemove({
    mutation: {
      onSuccess: () => {
        refrescarTodo(queryClient);
        toast.success('Subsanación eliminada');
      },
      onError: (error) =>
        toast.error(
          getApiErrorMessage(error, 'No se pudo eliminar la subsanación'),
        ),
    },
  });
};

export const useCreateSkuEquivalence = () => {
  const queryClient = useQueryClient();

  return useSkuEquivalencesControllerCreate({
    mutation: {
      onSuccess: () => {
        refrescarTodo(queryClient);
        toast.success('Equivalencia registrada');
      },
      onError: (error) =>
        toast.error(
          getApiErrorMessage(error, 'No se pudo registrar la equivalencia'),
        ),
    },
  });
};

export const useDeleteSkuEquivalence = () => {
  const queryClient = useQueryClient();

  return useSkuEquivalencesControllerRemove({
    mutation: {
      onSuccess: () => {
        refrescarTodo(queryClient);
        toast.success('Equivalencia eliminada');
      },
      onError: (error) =>
        toast.error(
          getApiErrorMessage(error, 'No se pudo eliminar la equivalencia'),
        ),
    },
  });
};
