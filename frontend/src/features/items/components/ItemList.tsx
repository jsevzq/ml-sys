import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AlertCircle, SearchX } from 'lucide-react';
import type { ItemDto } from '@/api/generated/models';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { getApiErrorMessage } from '@/lib/api-error';
import { SyncItemsButton } from '@/features/ml-connection';
import { useItems } from '../api/useItems';
import { ItemCard } from './ItemCard';
import { ItemCardSkeleton } from './ItemCardSkeleton';
import { ItemsTable } from './ItemsTable';
import { ItemsToolbar, type ItemView } from './ItemsToolbar';
import {
  INITIAL_FILTERS,
  countByStockStatus,
  presentStatuses,
  filterItems,
  filtersFromUrl,
  hasActiveFilters,
  type ItemFilters,
} from '../lib/item-filters';

const GRILLA =
  'grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4';

/** Referencia estable mientras el catálogo carga: si fuera un `[]` nuevo en cada
 *  render, los `useMemo` de abajo se recalcularían siempre. */
const SIN_ITEMS: ItemDto[] = [];

export function ItemList() {
  const { data: items, isPending, isError, error } = useItems();
  const [searchParams] = useSearchParams();
  // La URL sólo siembra el estado inicial: permite entrar desde el Resumen ya filtrado
  // por "agotados" sin convertir cada tecla del buscador en una entrada del historial.
  const [filters, setFilters] = useState<ItemFilters>(() =>
    filtersFromUrl(searchParams),
  );
  const [view, setView] = useState<ItemView>('tabla');

  // El catálogo entero se recorre varias veces (filtrar, ordenar, contar): con
  // cientos de publicaciones no hace falta rehacerlo en cada tecleo del buscador.
  const catalogo = items ?? SIN_ITEMS;
  const visibles = useMemo(
    () => filterItems(catalogo, filters),
    [catalogo, filters],
  );
  const conteo = useMemo(() => countByStockStatus(catalogo), [catalogo]);
  const statuses = useMemo(() => presentStatuses(catalogo), [catalogo]);

  if (isPending) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-9 w-full max-w-2xl" />
        <div className={GRILLA}>
          {Array.from({ length: 8 }).map((_, i) => (
            <ItemCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error de conexión</AlertTitle>
        <AlertDescription>
          No se pudieron cargar los productos.{' '}
          {getApiErrorMessage(error, 'Intente nuevamente.')}
        </AlertDescription>
      </Alert>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex min-h-[300px] flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
        <p className="text-lg font-medium">No hay productos sincronizados</p>
        <p className="mt-1 mb-4 max-w-xs text-sm text-muted-foreground">
          Sincronice el catálogo de Mercado Libre para verlo aquí.
        </p>
        <SyncItemsButton />
      </div>
    );
  }

  const withFilters = hasActiveFilters(filters);

  return (
    <div className="flex flex-col gap-4">
      <ItemsToolbar
        filters={filters}
        onChange={setFilters}
        statuses={statuses}
        conteo={conteo}
        view={view}
        onViewChange={setView}
        visibles={visibles.length}
        total={items.length}
        hasFilters={withFilters}
        onLimpiar={() => setFilters(INITIAL_FILTERS)}
        acciones={<SyncItemsButton />}
      />

      {visibles.length === 0 ? (
        <div className="flex min-h-[240px] flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-8 text-center">
          <SearchX className="size-6 text-muted-foreground" />
          <div>
            <p className="font-medium">Ningún producto coincide</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Pruebe con otro término o quite alguno de los filtros.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setFilters(INITIAL_FILTERS)}
          >
            Limpiar filtros
          </Button>
        </div>
      ) : view === 'tabla' ? (
        <ItemsTable items={visibles} />
      ) : (
        <div className={GRILLA}>
          {visibles.map((item) => (
            <ItemCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
