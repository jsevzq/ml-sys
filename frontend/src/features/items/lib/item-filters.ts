import type { ItemDto } from '@/api/generated/models';
import { itemTotals } from './item-display';
import {
  stockStatus,
  necesitaAtencion,
  type StockStatus,
} from './stock-status';

/**
 * Búsqueda, filtrado y orden del catálogo. Se resuelve en el cliente porque
 * `GET /items` ya devuelve el catálogo entero: pedirle al servidor que filtre
 * agregaría una vuelta de red para algo que ya está en memoria.
 */

export type StockFilter = 'todos' | 'atencion' | StockStatus;

export type ItemSort =
  | 'atencion'
  | 'stock-asc'
  | 'stock-desc'
  | 'vendidas-desc'
  | 'facturado-desc'
  | 'titulo';

export interface ItemFilters {
  search: string;
  status: string;
  stock: StockFilter;
  sort: ItemSort;
}

export const INITIAL_FILTERS: ItemFilters = {
  search: '',
  status: 'todos',
  stock: 'todos',
  /* Por defecto se ordena por lo que pide una acción, no alfabéticamente: quien abre
     esta pantalla todos los días viene a ver qué le falta reponer. No se oculta nada,
     sólo cambia el orden, así que el catálogo completo sigue estando. */
  sort: 'atencion',
};

const VALID_STOCK_FILTERS: StockFilter[] = [
  'todos',
  'atencion',
  'agotado',
  'critico',
  'bajo',
  'disponible',
];

/**
 * Filtros iniciales tomados de la URL: `/products?stock=agotado&q=tanza`. Es lo que
 * permite que el Resumen enlace directo a "lo que hay que reponer" en vez de dejar al
 * operador buscándolo a mano.
 */
export function filtersFromUrl(params: URLSearchParams): ItemFilters {
  const stock = params.get('stock');
  return {
    ...INITIAL_FILTERS,
    search: params.get('q') ?? '',
    stock: VALID_STOCK_FILTERS.includes(stock as StockFilter)
      ? (stock as StockFilter)
      : 'todos',
  };
}

export function hasActiveFilters(filters: ItemFilters) {
  return (
    filters.search.trim() !== '' ||
    filters.status !== 'todos' ||
    filters.stock !== 'todos'
  );
}

/** Texto sobre el que busca el buscador: título, id de ML y nombres de variante. */
function searchableText(item: ItemDto) {
  const variants = (item.variations ?? [])
    .map((v) => v.variantName ?? '')
    .join(' ');
  return `${item.title} ${item.id} ${variants}`.toLowerCase();
}

export function matchesSearch(item: ItemDto, search: string) {
  const termino = search.trim().toLowerCase();
  if (termino === '') return true;
  // Varias palabras: tienen que estar todas, en cualquier orden.
  const text = searchableText(item);
  return termino.split(/\s+/).every((palabra) => text.includes(palabra));
}

export function matchesStock(item: ItemDto, filter: StockFilter) {
  if (filter === 'todos') return true;
  const { available } = itemTotals(item);
  if (filter === 'atencion') return necesitaAtencion(available);
  return stockStatus(available) === filter;
}

/** Los estados de publicación que realmente aparecen en el catálogo. */
export function presentStatuses(items: ItemDto[]) {
  return [...new Set(items.map((item) => item.status))].sort();
}

const PESO_DE_ATENCION: Record<StockStatus, number> = {
  agotado: 0,
  critico: 1,
  bajo: 2,
  disponible: 3,
};

function comparar(a: ItemDto, b: ItemDto, sort: ItemSort) {
  const totalOfA = itemTotals(a);
  const totalOfB = itemTotals(b);

  switch (sort) {
    case 'atencion': {
      const peso =
        PESO_DE_ATENCION[stockStatus(totalOfA.available)] -
        PESO_DE_ATENCION[stockStatus(totalOfB.available)];
      // Dentro del mismo estado, primero lo que más se vende: es lo que más urge.
      return peso !== 0 ? peso : totalOfB.sold - totalOfA.sold;
    }
    case 'stock-asc':
      return totalOfA.available - totalOfB.available;
    case 'stock-desc':
      return totalOfB.available - totalOfA.available;
    case 'vendidas-desc':
      return totalOfB.sold - totalOfA.sold;
    case 'facturado-desc':
      return totalOfB.volume - totalOfA.volume;
    case 'titulo':
      return a.title.localeCompare(b.title, 'es');
  }
}

export function filterItems(items: ItemDto[], filters: ItemFilters) {
  return items
    .filter(
      (item) =>
        matchesSearch(item, filters.search) &&
        (filters.status === 'todos' || item.status === filters.status) &&
        matchesStock(item, filters.stock),
    )
    .sort((a, b) => comparar(a, b, filters.sort));
}

/** Cuántos productos hay en cada estado de stock, para los contadores del filtro. */
export function countByStockStatus(items: ItemDto[]) {
  const conteo = { agotado: 0, critico: 0, bajo: 0, disponible: 0 };
  for (const item of items) {
    conteo[stockStatus(itemTotals(item).available)] += 1;
  }
  return { ...conteo, atencion: conteo.agotado + conteo.critico + conteo.bajo };
}

export type ConteoDeStock = ReturnType<typeof countByStockStatus>;
