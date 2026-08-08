import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, PackageCheck } from 'lucide-react';
import type { ItemDto } from '@/api/generated/models';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
  STOCK_STATUS,
  StockBadge,
  stockStatus,
  FALLBACK_IMAGE,
  itemCover,
  itemTotals,
  necesitaAtencion,
  useItems,
  type StockStatus,
} from '@/features/items';

const AT_A_GLANCE = 5;

/** Primero lo agotado, y dentro de cada estado lo que más se vende. */
const URGENCIA: Record<StockStatus, number> = {
  agotado: 0,
  critico: 1,
  bajo: 2,
  disponible: 3,
};

function Contador({
  status,
  quantity,
}: {
  status: Exclude<StockStatus, 'disponible'>;
  quantity: number;
}) {
  const { label, fondo, text } = STOCK_STATUS[status];

  return (
    <Link
      to={`/products?stock=${status}`}
      className="flex items-center gap-2 rounded-md px-2 py-1 transition-colors hover:bg-muted"
    >
      <span aria-hidden className={cn('size-2 rounded-full', fondo)} />
      <span className={cn('text-lg font-semibold tabular-nums', text)}>
        {quantity}
      </span>
      <span className="text-sm text-muted-foreground">{label}</span>
    </Link>
  );
}

/**
 * Lo que hay que reponer, arriba de todo en el Resumen.
 *
 * El Resumen era íntegramente plata —facturado, comisiones, neto— y no decía una
 * palabra del inventario: un producto se agotaba y nadie se enteraba hasta entrar a
 * Productos. Esto es lo primero que ve quien abre el panel a la mañana.
 */
export function StockAtencion() {
  const { data: items, isPending, isError } = useItems();

  if (isPending) return <Skeleton className="h-36" />;
  // Si el catálogo falla, el resto del Resumen sigue sirviendo: no se muestra un error
  // más, que sólo agregaría ruido a una pantalla que no es la del catálogo.
  if (isError) return null;

  const conAtencion = items
    .map((item) => {
      const { available, sold } = itemTotals(item);
      return { item, disponible: available, sold: sold };
    })
    .filter(({ disponible }) => necesitaAtencion(disponible))
    .sort((a, b) => {
      const peso =
        URGENCIA[stockStatus(a.disponible)] -
        URGENCIA[stockStatus(b.disponible)];
      return peso !== 0 ? peso : b.sold - a.sold;
    });

  if (conAtencion.length === 0) {
    return (
      <Card size="sm">
        <CardContent className="flex items-center gap-3 text-sm">
          <PackageCheck className="size-4 text-success" />
          <span className="font-medium">Todo el catálogo tiene stock.</span>
          <span className="text-muted-foreground">
            Ninguna de las {items.length} publicaciones está por debajo del
            umbral.
          </span>
        </CardContent>
      </Card>
    );
  }

  const conteo = { agotado: 0, critico: 0, bajo: 0 };
  for (const { disponible } of conAtencion) {
    const status = stockStatus(disponible);
    if (status !== 'disponible') conteo[status] += 1;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Para reponer</CardTitle>
        <CardAction className="flex flex-wrap items-center gap-1">
          {conteo.agotado > 0 && (
            <Contador status="agotado" quantity={conteo.agotado} />
          )}
          {conteo.critico > 0 && (
            <Contador status="critico" quantity={conteo.critico} />
          )}
          {conteo.bajo > 0 && <Contador status="bajo" quantity={conteo.bajo} />}
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-1">
        <ul className="divide-y">
          {conAtencion
            .slice(0, AT_A_GLANCE)
            .map(({ item, disponible, sold }) => (
              <ProductToRestock
                key={item.id}
                item={item}
                disponible={disponible}
                sold={sold}
              />
            ))}
        </ul>

        {conAtencion.length > AT_A_GLANCE && (
          <Button asChild variant="link" size="sm" className="px-0">
            <Link to="/products?stock=atencion">
              Ver las {conAtencion.length} publicaciones que necesitan atención
              <ArrowRight />
            </Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

/** La foto de la publicación, con el fallback si ML no tiene o la URL falla. */
function Miniatura({ item }: { item: ItemDto }) {
  const [source, setSource] = useState(() => itemCover(item));

  return (
    <img
      src={source}
      alt=""
      onError={() => setSource(FALLBACK_IMAGE)}
      className="size-9 shrink-0 rounded-md bg-muted object-contain"
    />
  );
}

function ProductToRestock({
  item,
  disponible,
  sold,
}: {
  item: ItemDto;
  disponible: number;
  sold: number;
}) {
  return (
    <li className="flex items-center justify-between gap-3 py-2 text-sm">
      <Link
        to={`/products/${item.id}`}
        className="flex min-w-0 items-center gap-2.5 hover:underline"
      >
        <Miniatura item={item} />
        <span className="line-clamp-1 font-medium">{item.title}</span>
      </Link>
      <div className="flex shrink-0 items-center gap-3">
        <span className="hidden text-xs text-muted-foreground tabular-nums sm:inline">
          {sold} vendidas
        </span>
        <span className="w-12 text-right font-semibold tabular-nums">
          {disponible} u.
        </span>
        <StockBadge quantity={disponible} />
      </div>
    </li>
  );
}
