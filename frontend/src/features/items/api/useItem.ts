import {
  useItemsControllerFindOne,
  getItemsControllerFindOneQueryKey,
} from '@/api/generated/items/items';

/**
 * Publicación individual con todo su detalle: fotos, atributos y variaciones
 * (cada una con sus propias fotos y opciones).
 *
 * `GET /items` no trae las opciones de las variaciones, así que la pantalla de
 * detalle no puede reutilizar la caché del listado: pide su propia query.
 */
export const useItem = (id: string | undefined) =>
  useItemsControllerFindOne(id ?? '', {
    query: { enabled: Boolean(id) },
  });

/** Clave de caché de una publicación. */
export const itemQueryKey = getItemsControllerFindOneQueryKey;
