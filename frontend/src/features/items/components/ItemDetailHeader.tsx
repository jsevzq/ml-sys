import { useState } from 'react';
import {
  ExternalLink,
  Layers,
  Package,
  ShoppingCart,
  DollarSign,
} from 'lucide-react';
import type { ItemDto } from '@/api/generated/models';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import {
  FALLBACK_IMAGE,
  formatPrice,
  healthColorClass,
  itemCover,
  itemTotals,
  logisticLabel,
  optionLabel,
  optionValue,
  priceLabel,
  statusLabel,
  stockTextClass,
} from '../lib/item-display';
import { StockBadge } from './StockBadge';

function Kpi({
  icon,
  label,
  value,
  valueClassName,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  valueClassName?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        {label}
      </p>
      <p
        className={`text-lg font-semibold tabular-nums ${valueClassName ?? ''}`}
      >
        {value}
      </p>
      {children}
    </div>
  );
}

export function ItemDetailHeader({ item }: { item: ItemDto }) {
  const [imgSrc, setImgSrc] = useState(() => itemCover(item));

  const { available, sold, variants, volume } = itemTotals(item);
  const hasHealth = item.health !== null && item.health !== undefined;
  const options = item.attributeOptions ?? [];

  return (
    <Card>
      <CardContent className="grid gap-6 md:grid-cols-[220px_1fr]">
        <div className="w-full max-w-[220px]">
          <AspectRatio
            ratio={1 / 1}
            className="overflow-hidden rounded-lg bg-muted"
          >
            <img
              src={imgSrc}
              alt={item.title}
              onError={() => setImgSrc(FALLBACK_IMAGE)}
              className="h-full w-full object-contain"
            />
          </AspectRatio>
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant={item.status === 'active' ? 'default' : 'secondary'}
                className="uppercase text-[10px]"
              >
                {statusLabel(item.status)}
              </Badge>
              <Badge variant="outline" className="capitalize">
                {logisticLabel(item.logisticType)}
              </Badge>
              {variants > 0 && (
                <Badge variant="secondary">
                  <Layers />
                  {variants} {variants === 1 ? 'variante' : 'variantes'}
                </Badge>
              )}
            </div>

            <h1 className="text-2xl font-semibold leading-tight">
              {item.title}
            </h1>

            <p className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="font-mono">{item.id}</span>
              <span aria-hidden>·</span>
              <span className="font-mono">{item.categoryId}</span>
            </p>
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Kpi
              icon={<DollarSign className="h-3.5 w-3.5" />}
              label={variants > 0 ? 'Precio por variante' : 'Precio'}
              value={priceLabel(item)}
            />
            <Kpi
              icon={<Package className="h-3.5 w-3.5" />}
              label="Stock disponible"
              value={`${available} u.`}
              valueClassName={stockTextClass(available)}
            >
              <StockBadge quantity={available} />
            </Kpi>
            <Kpi
              icon={<ShoppingCart className="h-3.5 w-3.5" />}
              label="Unidades vendidas"
              value={String(sold)}
            />
            <Kpi
              icon={<DollarSign className="h-3.5 w-3.5" />}
              label="Volumen de ventas"
              value={formatPrice(volume, item.currencyId)}
            />
          </div>

          <div className="max-w-sm space-y-1.5">
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

          {options.length > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">
                  Ficha técnica
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {options.map((option) => (
                    <Badge
                      key={`${option.attributeId}-${option.id}`}
                      variant="outline"
                    >
                      <span className="text-muted-foreground">
                        {optionLabel(option)}:
                      </span>
                      <span className="font-medium">{optionValue(option)}</span>
                    </Badge>
                  ))}
                </div>
              </div>
            </>
          )}

          <div>
            <Button asChild size="sm">
              <a href={item.permalink} target="_blank" rel="noreferrer">
                <ExternalLink />
                Ver en Mercado Libre
              </a>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
