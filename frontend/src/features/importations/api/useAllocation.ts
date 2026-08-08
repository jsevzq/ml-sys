import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  useImportationsControllerAllocation,
  useImportationsControllerRecalculate,
} from '@/api/generated/importations/importations';
import { getApiErrorMessage } from '@/lib/api-error';

/** Cómo quedó repartido el stock de los lotes entre las ventas. */
export const useAllocation = () => useImportationsControllerAllocation();

export const useRecalculateAllocation = () => {
  const queryClient = useQueryClient();

  return useImportationsControllerRecalculate({
    mutation: {
      onSuccess: (result) => {
        queryClient.invalidateQueries({ queryKey: ['/importations'] });
        toast.success(
          `${result.allocatedUnits} units atribuidas a lotes` +
            (result.unitsWithoutLot > 0
              ? `, ${result.unitsWithoutLot} sin lote`
              : ''),
        );
      },
      onError: (error) =>
        toast.error(
          getApiErrorMessage(error, 'No se pudo recalcular la atribución'),
        ),
    },
  });
};
