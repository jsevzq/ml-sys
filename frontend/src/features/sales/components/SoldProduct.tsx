import { Link } from 'react-router-dom';
import { PackageX } from 'lucide-react';
import type { OrderItemDto } from '@/api/generated/models';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

/**
 * El producto vendido, enlazado al catálogo cuando todavía existe.
 *
 * `itemId` viene en null si la publicación se eliminó de Mercado Libre o si nunca se
 * sincronizó: en ese caso mostramos el título tal como estaba al momento de la venta,
 * sin enlace, porque no hay ficha a la que ir.
 */
export function SoldProduct({ item }: { item: OrderItemDto }) {
  const enlazable = Boolean(item.itemId);

  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      {enlazable ? (
        <Link
          to={`/products/${item.itemId}`}
          className="line-clamp-2 font-medium hover:underline"
        >
          {item.title}
        </Link>
      ) : (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="flex min-w-0 items-start gap-1.5 text-muted-foreground">
              <PackageX className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span className="line-clamp-2">{item.title}</span>
            </span>
          </TooltipTrigger>
          <TooltipContent>
            <p>Esta publicación ya no está en el catálogo</p>
          </TooltipContent>
        </Tooltip>
      )}

      <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
        <span className="font-mono">{item.mlItemId}</span>
        {item.variantName && (
          <Badge variant="outline" className="h-4 px-1.5 text-[10px]">
            {item.variantName}
          </Badge>
        )}
      </div>
    </div>
  );
}
