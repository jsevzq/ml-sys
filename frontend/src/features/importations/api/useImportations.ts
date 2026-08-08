import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  useImportationsControllerFindAll,
  useImportationsControllerCreate,
  useImportationsControllerUpdate,
  useImportationsControllerRemove,
  getImportationsControllerFindAllQueryKey,
} from '@/api/generated/importations/importations';
import { getApiErrorMessage } from '@/lib/api-error';

export const useImportations = () => useImportationsControllerFindAll();

export const importationsQueryKey = getImportationsControllerFindAllQueryKey;

/** Al crear o borrar un lote el backend recalcula la atribución FIFO, así que hay
 *  que invalidar también lo que dependa del stock vendido. */
const useInvalidateImportations = () => {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ['/importations'] });
};

export const useCreateImportation = () => {
  const invalidar = useInvalidateImportations();

  return useImportationsControllerCreate({
    mutation: {
      onSuccess: () => {
        invalidar();
        toast.success('Importación registrada');
      },
      onError: (error) =>
        toast.error(
          getApiErrorMessage(error, 'No se pudo registrar la importación'),
        ),
    },
  });
};

export const useUpdateImportation = () => {
  const invalidar = useInvalidateImportations();

  return useImportationsControllerUpdate({
    mutation: {
      onSuccess: () => {
        invalidar();
        toast.success('Importación actualizada');
      },
      onError: (error) =>
        toast.error(
          getApiErrorMessage(error, 'No se pudo actualizar la importación'),
        ),
    },
  });
};

export const useDeleteImportation = () => {
  const invalidar = useInvalidateImportations();

  return useImportationsControllerRemove({
    mutation: {
      onSuccess: () => {
        invalidar();
        toast.success('Importación eliminada');
      },
      onError: (error) =>
        toast.error(
          getApiErrorMessage(error, 'No se pudo eliminar la importación'),
        ),
    },
  });
};
