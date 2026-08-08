/**
 * Resolución de SKUs de Mercado Libre que cambiaron de id.
 *
 * ML no deja renombrar una variante: se borra y se crea otra, con id nuevo y el
 * contador de ventas en cero. Las ventas viejas siguen apuntando al id muerto. Acá
 * se traduce cualquier SKU al que lo representa hoy, siguiendo la cadena si hubo
 * más de un cambio.
 */

export interface Sku {
  mlItemId: string;
  mlVariationId: string | null;
}

export interface Equivalencia {
  fromItemId: string;
  fromVariationId: string | null;
  toItemId: string;
  toVariationId: string | null;
}

const key = (sku: Sku): string =>
  sku.mlVariationId ? `v:${sku.mlVariationId}` : `i:${sku.mlItemId}`;

export type MapaDeEquivalencias = Map<string, Sku>;

export function buildMap(equivalences: Equivalencia[]): MapaDeEquivalencias {
  const mapa: MapaDeEquivalencias = new Map();
  for (const equivalencia of equivalences) {
    mapa.set(
      key({
        mlItemId: equivalencia.fromItemId,
        mlVariationId: equivalencia.fromVariationId,
      }),
      {
        mlItemId: equivalencia.toItemId,
        mlVariationId: equivalencia.toVariationId,
      },
    );
  }
  return mapa;
}

/**
 * El SKU vigente. Sigue la cadena por si una variante se recreó más de una vez, y
 * corta ante un ciclo devolviendo lo último sano en vez de colgarse.
 */
export function resolveSku(sku: Sku, mapa: MapaDeEquivalencias): Sku {
  const visitados = new Set<string>();
  let actual = sku;

  for (;;) {
    const ownKey = key(actual);
    if (visitados.has(ownKey)) return actual;
    visitados.add(ownKey);

    const next = mapa.get(ownKey);
    if (!next) return actual;
    actual = next;
  }
}
