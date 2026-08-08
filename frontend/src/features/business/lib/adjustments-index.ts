import type { AdjustmentDto } from '@/api/generated/models';
import { useAdjustments } from '../api/useAdjustments';

/**
 * Índice de las subsanaciones por lo que tocan. Se resuelve del lado del cliente
 * porque la lista entera es chica y así una sola consulta alcanza para marcar
 * lotes, líneas y ventas sin pedirle nada más al backend.
 */
export function useAdjustmentsByTarget() {
  const { data } = useAdjustments();

  const byLine = new Map<number, AdjustmentDto[]>();
  const bySale = new Map<number, AdjustmentDto[]>();

  for (const adjustment of data ?? []) {
    const line = adjustment.importationProductId;
    const sale = adjustment.orderItemId;

    if (line != null) {
      byLine.set(line, [...(byLine.get(line) ?? []), adjustment]);
    } else if (sale != null) {
      bySale.set(sale, [...(bySale.get(sale) ?? []), adjustment]);
    }
  }

  return { byLine, bySale, todas: data ?? [] };
}
