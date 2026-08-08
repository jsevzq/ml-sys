import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  useAdditionalCostTypesControllerFindAll,
  useAdditionalCostTypesControllerCreate,
  useAdditionalCostTypesControllerRemove,
} from '@/api/generated/additional-cost-types/additional-cost-types';
import { getApiErrorMessage } from '@/lib/api-error';

/** Catálogo propio de conceptos de costo: Régimen simplificado, Envío, Despachante… */
export const useCostTypes = () => useAdditionalCostTypesControllerFindAll();

const useInvalidateCostTypes = () => {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ['/cost-types'] });
};

export const useCreateCostType = () => {
  const invalidar = useInvalidateCostTypes();

  return useAdditionalCostTypesControllerCreate({
    mutation: {
      onSuccess: () => {
        invalidar();
        toast.success('Tipo de costo creado');
      },
      onError: (error) =>
        toast.error(
          getApiErrorMessage(error, 'No se pudo crear el tipo de costo'),
        ),
    },
  });
};

export const useDeleteCostType = () => {
  const invalidar = useInvalidateCostTypes();

  return useAdditionalCostTypesControllerRemove({
    mutation: {
      onSuccess: () => {
        invalidar();
        toast.success('Tipo de costo eliminado');
      },
      // El backend responde 409 si el tipo está usado en alguna importación.
      onError: (error) =>
        toast.error(
          getApiErrorMessage(error, 'No se pudo eliminar el tipo de costo'),
        ),
    },
  });
};
