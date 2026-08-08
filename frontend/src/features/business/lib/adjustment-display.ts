import { AdjustmentDtoType } from '@/api/generated/models';
import type { AdjustmentDto } from '@/api/generated/models';

/**
 * Qué es cada tipo de subsanación, en un solo lugar.
 *
 * El nombre estaba duplicado en tres componentes y en ninguno se explicaba qué
 * significa: "Mutación" y "Swap" son jerga de este sistema, no algo que se
 * entienda de leerlo. La descripción va con el dato para que la pantalla se
 * explique sola.
 */
export const ADJUSTMENT_KIND = {
  [AdjustmentDtoType.swap]: {
    nombre: 'Swap',
    plural: 'Swaps',
    descripcion: 'Se despachó un producto distinto al que abonó el comprador.',
  },
  [AdjustmentDtoType.mutation]: {
    nombre: 'Mutación',
    plural: 'Mutaciones',
    descripcion:
      'Unidades de la importación que se pasaron a vender como otro producto o variante.',
  },
  [AdjustmentDtoType.destruction]: {
    nombre: 'Destrucción',
    plural: 'Destrucciones',
    descripcion:
      'Unidades que salieron del stock sin venderse: rotura, uso propio o pérdida.',
  },
} as const;

export const ADJUSTMENT_KINDS = [
  AdjustmentDtoType.swap,
  AdjustmentDtoType.mutation,
  AdjustmentDtoType.destruction,
] as const;

export function typeName(kind: AdjustmentDtoType) {
  return ADJUSTMENT_KIND[kind].nombre;
}

/** Cuántas subsanaciones y cuántas unidades hay de cada tipo. */
export function summarizeAdjustments(adjustments: AdjustmentDto[]) {
  const byKind = {
    swap: { quantity: 0, units: 0 },
    mutation: { quantity: 0, units: 0 },
    destruction: { quantity: 0, units: 0 },
  };

  for (const adjustment of adjustments) {
    byKind[adjustment.type].quantity += 1;
    byKind[adjustment.type].units += adjustment.quantity;
  }

  return {
    byKind,
    total: adjustments.length,
    units: adjustments.reduce((suma, s) => suma + s.quantity, 0),
  };
}
