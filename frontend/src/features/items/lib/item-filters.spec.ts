import { describe, expect, it } from 'vitest';
import type { ItemDto } from '@/api/generated/models';
import {
  matchesSearch,
  matchesStock,
  countByStockStatus,
  filterItems,
  filtersFromUrl,
  hasActiveFilters,
  INITIAL_FILTERS,
} from './item-filters';

/** Un item con lo mínimo que miran los filtros. */
function item(parcial: Partial<ItemDto> & { id: string }): ItemDto {
  return {
    title: 'Pendrive USB 3.2 Metálico - 64 GB',
    status: 'active',
    availableQuantity: 10,
    soldQuantity: 0,
    price: 900,
    currencyId: 'UYU',
    variations: [],
    ...parcial,
  } as ItemDto;
}

describe('coincideBusqueda', () => {
  const pendrive = item({ id: 'MLU1234567890' });

  it('sin término entra todo', () => {
    expect(matchesSearch(pendrive, '   ')).toBe(true);
  });

  it('busca por título sin importar mayúsculas', () => {
    expect(matchesSearch(pendrive, 'METÁLICO')).toBe(true);
  });

  it('busca por el id de Mercado Libre', () => {
    expect(matchesSearch(pendrive, 'mlu1234')).toBe(true);
  });

  // Con un catálogo donde todo empieza igual, escribir dos palabras sueltas es la
  // forma natural de acotar: "pendrive 128" tiene que encontrar esa capacidad.
  it('exige todas las palabras, en cualquier orden', () => {
    const withVariants = item({
      id: 'MLU1',
      variations: [{ variantName: 'Capacidad: 128 GB' }],
    } as Partial<ItemDto> & { id: string });

    expect(matchesSearch(withVariants, '128 pendrive')).toBe(true);
    expect(matchesSearch(withVariants, 'pendrive 256')).toBe(false);
  });
});

describe('coincideStock', () => {
  it("'todos' no filtra nada", () => {
    expect(matchesStock(item({ id: 'A', availableQuantity: 0 }), 'todos')).toBe(
      true,
    );
  });

  it("'atencion' junta agotado, crítico y bajo", () => {
    expect(
      matchesStock(item({ id: 'A', availableQuantity: 0 }), 'atencion'),
    ).toBe(true);
    expect(
      matchesStock(item({ id: 'B', availableQuantity: 4 }), 'atencion'),
    ).toBe(true);
    expect(
      matchesStock(item({ id: 'C', availableQuantity: 40 }), 'atencion'),
    ).toBe(false);
  });

  it('un estado puntual filtra sólo ese', () => {
    expect(
      matchesStock(item({ id: 'A', availableQuantity: 0 }), 'agotado'),
    ).toBe(true);
    expect(
      matchesStock(item({ id: 'B', availableQuantity: 4 }), 'agotado'),
    ).toBe(false);
  });

  // El stock de una publicación con variantes es la suma de las variantes, no el
  // campo de la publicación: mirar el campo daría cero y la marcaría agotada.
  it('suma el stock de las variantes', () => {
    const withVariants = item({
      id: 'MLU1',
      availableQuantity: 0,
      variations: [
        { availableQuantity: 6, soldQuantity: 0, price: 900 },
        { availableQuantity: 5, soldQuantity: 0, price: 900 },
      ],
    } as Partial<ItemDto> & { id: string });

    expect(matchesStock(withVariants, 'disponible')).toBe(true);
  });
});

describe('filtrosDesdeUrl', () => {
  it('toma la búsqueda y el filtro de stock', () => {
    const filters = filtersFromUrl(
      new URLSearchParams('q=pendrive&stock=agotado'),
    );
    expect(filters.search).toBe('pendrive');
    expect(filters.stock).toBe('agotado');
  });

  // Un enlace viejo o escrito a mano no debe dejar la pantalla en un estado que
  // no existe: se cae al valor por defecto en vez de mostrar cero resultados.
  it('descarta un filtro de stock que no existe', () => {
    expect(filtersFromUrl(new URLSearchParams('stock=inventado')).stock).toBe(
      'todos',
    );
  });

  it('sin parámetros devuelve los filtros iniciales', () => {
    expect(filtersFromUrl(new URLSearchParams())).toEqual(INITIAL_FILTERS);
  });
});

describe('hayFiltrosActivos', () => {
  it('es falso con los filtros iniciales', () => {
    expect(hasActiveFilters(INITIAL_FILTERS)).toBe(false);
  });

  it('ignora una búsqueda de sólo espacios', () => {
    expect(hasActiveFilters({ ...INITIAL_FILTERS, search: '  ' })).toBe(false);
  });

  it('es verdadero cuando se toca algo', () => {
    expect(hasActiveFilters({ ...INITIAL_FILTERS, stock: 'agotado' })).toBe(
      true,
    );
  });
});

describe('filtrarItems', () => {
  const catalogo = [
    item({
      id: 'A',
      title: 'Soporte',
      availableQuantity: 40,
      soldQuantity: 2,
    }),
    item({ id: 'B', title: 'Hub', availableQuantity: 0, soldQuantity: 9 }),
    item({ id: 'C', title: 'Pendrive', availableQuantity: 0, soldQuantity: 30 }),
    item({ id: 'D', title: 'Cable', availableQuantity: 4, soldQuantity: 1 }),
  ];

  // Quien abre esta pantalla viene a ver qué reponer, y dentro de lo agotado
  // importa primero lo que más se vende.
  it('ordena por atención y, dentro del estado, por lo más vendido', () => {
    const sort = filterItems(catalogo, INITIAL_FILTERS).map((i) => i.id);
    expect(sort).toEqual(['C', 'B', 'D', 'A']);
  });

  it('combina búsqueda, estado y stock', () => {
    const output = filterItems(catalogo, {
      ...INITIAL_FILTERS,
      search: 'hub',
      stock: 'agotado',
    });
    expect(output.map((i) => i.id)).toEqual(['B']);
  });

  it('no muta el arreglo que recibe', () => {
    const original = catalogo.map((i) => i.id);
    filterItems(catalogo, INITIAL_FILTERS);
    expect(catalogo.map((i) => i.id)).toEqual(original);
  });
});

describe('contarPorEstadoDeStock', () => {
  it('cuenta cada estado y suma los que piden atención', () => {
    const conteo = countByStockStatus([
      item({ id: 'A', availableQuantity: 0 }),
      item({ id: 'B', availableQuantity: 2 }),
      item({ id: 'C', availableQuantity: 5 }),
      item({ id: 'D', availableQuantity: 40 }),
    ]);

    expect(conteo).toEqual({
      agotado: 1,
      critico: 1,
      bajo: 1,
      disponible: 1,
      atencion: 3,
    });
  });
});
