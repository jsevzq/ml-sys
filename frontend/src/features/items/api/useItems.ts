import {
  useItemsControllerFindAll,
  getItemsControllerFindAllQueryKey,
} from '@/api/generated/items/items';

/**
 * Catálogo de publicaciones sincronizadas desde Mercado Libre.
 *
 * Envolvemos el hook generado en vez de usarlo directo en los componentes: si mañana
 * cambia el nombre del endpoint, Orval regenera otro nombre y sólo hay que tocar
 * este archivo, no cada componente que consume items.
 */
export const useItems = () => useItemsControllerFindAll();

/** Clave de caché del catálogo. Se usa para invalidarlo tras sincronizar con ML. */
export const itemsQueryKey = getItemsControllerFindAllQueryKey;
