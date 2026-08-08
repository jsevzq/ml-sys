import { LayoutGrid, Rows3, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@/components/ui/input-group';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { cn } from '@/lib/utils';
import { statusLabel } from '../lib/item-display';
import type { ConteoDeStock, ItemFilters, ItemSort } from '../lib/item-filters';
import { STOCK_STATUS } from '../lib/stock-status';

export type ItemView = 'tabla' | 'grilla';

const SORTS: { value: ItemSort; label: string }[] = [
  { value: 'atencion', label: 'Lo que necesita atención' },
  { value: 'stock-asc', label: 'Menos stock primero' },
  { value: 'stock-desc', label: 'Más stock primero' },
  { value: 'vendidas-desc', label: 'Más vendidas' },
  { value: 'facturado-desc', label: 'Más facturación' },
  { value: 'titulo', label: 'Nombre (A–Z)' },
];

/** Los estados de stock ofrecidos como filtro, en el orden en que urgen. */
const STOCK_FILTERS: { value: keyof ConteoDeStock; label: string }[] = [
  { value: 'atencion', label: 'Necesita atención' },
  { value: 'agotado', label: STOCK_STATUS.agotado.label },
  { value: 'critico', label: STOCK_STATUS.critico.label },
  { value: 'bajo', label: STOCK_STATUS.bajo.label },
  { value: 'disponible', label: STOCK_STATUS.disponible.label },
];

interface ItemsToolbarProps {
  filters: ItemFilters;
  onChange: (filters: ItemFilters) => void;
  statuses: string[];
  conteo: ConteoDeStock;
  view: ItemView;
  onViewChange: (view: ItemView) => void;
  /** Cantidad de productos que quedan tras filtrar, sobre el total. */
  visibles: number;
  total: number;
  acciones?: React.ReactNode;
  hasFilters: boolean;
  onLimpiar: () => void;
}

/**
 * Buscar, filtrar y ordenar el catálogo. Los contadores por estado de stock son
 * a la vez alerta y filtro: se ve cuántos productos están agotados y con un clic
 * se queda sólo con ésos.
 */
export function ItemsToolbar({
  filters,
  onChange,
  statuses,
  conteo,
  view,
  onViewChange,
  visibles,
  total,
  acciones,
  hasFilters,
  onLimpiar,
}: ItemsToolbarProps) {
  const set = <C extends keyof ItemFilters>(campo: C, value: ItemFilters[C]) =>
    onChange({ ...filters, [campo]: value });

  const toggleStockFilter = (value: keyof ConteoDeStock) =>
    set('stock', filters.stock === value ? 'todos' : value);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <InputGroup className="w-full sm:max-w-xs">
          <InputGroupAddon>
            <Search />
          </InputGroupAddon>
          <InputGroupInput
            placeholder="Buscar por nombre, código o variante"
            aria-label="Buscar productos"
            value={filters.search}
            onChange={(evento) => set('search', evento.target.value)}
          />
          {filters.search !== '' && (
            <InputGroupAddon align="inline-end">
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Limpiar la búsqueda"
                onClick={() => set('search', '')}
              >
                <X />
              </Button>
            </InputGroupAddon>
          )}
        </InputGroup>

        {/* En móvil los selects se quedan con una fila entera y la reparten a
            mitades: compartiéndola con el toggle y el botón de sincronizar quedaban
            reducidos a la flecha, sin texto legible. */}
        <div className="flex w-full min-w-0 items-center gap-2 sm:w-auto">
          <Label htmlFor="filtro-estado" className="sr-only">
            Estado de la publicación
          </Label>
          <Select
            value={filters.status}
            onValueChange={(value) => set('status', value)}
          >
            <SelectTrigger
              id="filtro-estado"
              size="sm"
              className="min-w-0 flex-1 sm:w-[150px] sm:flex-none"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todas las publicaciones</SelectItem>
              {statuses.map((status) => (
                <SelectItem key={status} value={status}>
                  {statusLabel(status)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Label htmlFor="filtro-orden" className="sr-only">
            Ordenar por
          </Label>
          <Select
            value={filters.sort}
            onValueChange={(value) => set('sort', value as ItemSort)}
          >
            <SelectTrigger
              id="filtro-orden"
              size="sm"
              className="min-w-0 flex-1 sm:w-[210px] sm:flex-none"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORTS.map((sort) => (
                <SelectItem key={sort.value} value={sort.value}>
                  {sort.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <ToggleGroup
            type="single"
            variant="outline"
            size="sm"
            value={view}
            onValueChange={(value) => value && onViewChange(value as ItemView)}
          >
            <ToggleGroupItem value="tabla" aria-label="Ver como tabla">
              <Rows3 />
            </ToggleGroupItem>
            <ToggleGroupItem value="grilla" aria-label="Ver como grilla">
              <LayoutGrid />
            </ToggleGroupItem>
          </ToggleGroup>
          {acciones}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {STOCK_FILTERS.map(({ value, label }) => {
          const quantity = conteo[value];
          const activo = filters.stock === value;
          // Un estado sin productos no se ofrece: filtrar por él daría una lista vacía.
          if (quantity === 0 && !activo) return null;

          return (
            <Button
              key={value}
              size="sm"
              variant={activo ? 'secondary' : 'ghost'}
              aria-pressed={activo}
              className={cn(
                'h-7 gap-1.5 px-2.5 text-xs font-medium',
                !activo && 'text-muted-foreground',
              )}
              onClick={() => toggleStockFilter(value)}
            >
              {value !== 'atencion' && (
                <span
                  aria-hidden
                  className={cn(
                    'size-2 rounded-full',
                    STOCK_STATUS[value].fondo,
                  )}
                />
              )}
              {label}
              <span className="tabular-nums opacity-70">{quantity}</span>
            </Button>
          );
        })}

        <p className="ml-auto text-sm text-muted-foreground tabular-nums">
          {hasFilters ? `${visibles} de ${total}` : total}{' '}
          {total === 1 ? 'publicación' : 'publicaciones'}
          {hasFilters && (
            <Button
              variant="link"
              size="sm"
              className="h-auto px-2 py-0"
              onClick={onLimpiar}
            >
              Limpiar filtros
            </Button>
          )}
        </p>
      </div>
    </div>
  );
}
