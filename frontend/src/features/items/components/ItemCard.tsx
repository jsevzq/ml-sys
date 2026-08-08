import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ExternalLink,
  Layers,
  Package,
  ShoppingCart,
  DollarSign,
} from 'lucide-react';
import type { ItemDto } from '@/api/generated/models';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import {
  FALLBACK_IMAGE,
  formatPrice,
  healthColorClass,
  itemCover,
  itemTotals,
  logisticLabel,
  priceLabel,
  statusLabel,
  stockTextClass,
} from '../lib/item-display';
import { StockBadge } from './StockBadge';
import { necesitaAtencion } from '../lib/stock-status';

export function ItemCard({ item }: { item: ItemDto }) {
  const [imgSrc, setImgSrc] = useState(() => itemCover(item));

  const { available, sold, variants, volume } = itemTotals(item);
  const hasHealth = item.health !== null && item.health !== undefined;

  return (
    <Card className="group flex flex-col gap-0 py-0 transition-shadow hover:shadow-lg">
      <Link to={`/products/${item.id}`} className="relative block">
        <AspectRatio ratio={1 / 1} className="bg-muted">
          <img
            src={imgSrc}
            alt={item.title}
            onError={() => setImgSrc(FALLBACK_IMAGE)}
            className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-105"
          />
        </AspectRatio>

        <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-2">
          <Badge
            variant={item.status === 'active' ? 'default' : 'secondary'}
            className="uppercase text-[10px]"
          >
            {statusLabel(item.status)}
          </Badge>
          {variants > 0 && (
            <Badge variant="secondary" className="text-[10px]">
              <Layers />
              {variants}
            </Badge>
          )}
        </div>

        {/* El estado que pide una acción se muestra sobre la foto, que es lo que el
            ojo encuentra primero al recorrer la grilla. Lo que está en orden no
            necesita cartel: se lee en el número de stock, más abajo. */}
        {necesitaAtencion(available) && (
          <div className="absolute inset-x-0 bottom-0 flex justify-center bg-background/85 p-1.5">
            <StockBadge quantity={available} withQuantity />
          </div>
        )}
      </Link>

      <CardHeader className="gap-1 px-4 pt-4">
        <Tooltip>
          <TooltipTrigger asChild>
            <Link
              to={`/products/${item.id}`}
              className="line-clamp-2 text-base font-semibold leading-tight hover:underline"
            >
              {item.title}
            </Link>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            <p>{item.title}</p>
          </TooltipContent>
        </Tooltip>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="font-mono">{item.id}</span>
          <span aria-hidden>·</span>
          <span className="truncate capitalize">
            {logisticLabel(item.logisticType)}
          </span>
        </div>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-3 px-4 py-3">
        <p className="text-xl font-semibold tracking-tight tabular-nums">
          {priceLabel(item)}
        </p>

        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div className="space-y-0.5">
            <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Package className="h-3.5 w-3.5 shrink-0" />
              Stock
            </dt>
            <dd
              className={`font-semibold tabular-nums ${stockTextClass(available)}`}
            >
              {available} u.
            </dd>
          </div>

          <div className="space-y-0.5">
            <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <ShoppingCart className="h-3.5 w-3.5 shrink-0" />
              Vendidas
            </dt>
            <dd className="font-semibold tabular-nums">{sold}</dd>
          </div>

          <div className="col-span-2 space-y-0.5">
            <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <DollarSign className="h-3.5 w-3.5 shrink-0" />
              Facturado
            </dt>
            <dd className="truncate font-semibold tabular-nums">
              {formatPrice(volume, item.currencyId)}
            </dd>
          </div>
        </dl>

        <div className="mt-auto space-y-1.5 pt-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Salud de la publicación</span>
            <span>
              {hasHealth ? `${Math.round(item.health! * 100)}%` : 'Sin datos'}
            </span>
          </div>
          <Progress
            value={hasHealth ? item.health! * 100 : 0}
            indicatorClassName={
              hasHealth ? healthColorClass(item.health!) : 'bg-transparent'
            }
          />
        </div>
      </CardContent>

      <Separator />

      <CardFooter className="grid grid-cols-2 gap-2 px-4 py-3">
        <Button asChild variant="outline" size="sm" className="w-full">
          <Link to={`/products/${item.id}`}>
            <Layers />
            {variants > 0 ? `Variantes (${variants})` : 'Ver detail'}
          </Link>
        </Button>
        <Button asChild size="sm" className="w-full">
          <a href={item.permalink} target="_blank" rel="noreferrer">
            <ExternalLink />
            Ver en ML
          </a>
        </Button>
      </CardFooter>
    </Card>
  );
}
