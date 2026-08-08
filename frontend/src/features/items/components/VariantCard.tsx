import { useState } from 'react';
import { Package, ShoppingCart } from 'lucide-react';
import type { ItemDto, VariationDto } from '@/api/generated/models';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import {
  FALLBACK_IMAGE,
  formatPrice,
  optionLabel,
  optionValue,
  stockTextClass,
  variantCover,
  variantTitle,
} from '../lib/item-display';
import { StockBadge } from './StockBadge';
import { necesitaAtencion } from '../lib/stock-status';

interface VariantCardProps {
  item: ItemDto;
  variation: VariationDto;
  /** Total vendido del producto, para calcular cuánto aporta esta variante. */
  totalSold: number;
}

export function VariantCard({ item, variation, totalSold }: VariantCardProps) {
  const [imgSrc, setImgSrc] = useState(() => variantCover(item, variation));

  const share = totalSold > 0 ? (variation.soldQuantity / totalSold) * 100 : 0;
  const options = variation.attributeOptions ?? [];

  return (
    <Card size="sm" className="gap-0 py-0">
      <div className="relative">
        <AspectRatio ratio={4 / 3} className="bg-muted">
          <img
            src={imgSrc}
            alt={variantTitle(variation)}
            onError={() => setImgSrc(FALLBACK_IMAGE)}
            className="h-full w-full object-contain"
          />
        </AspectRatio>
        {necesitaAtencion(variation.availableQuantity) && (
          <div className="absolute inset-x-0 bottom-0 flex justify-center bg-background/85 p-1.5">
            <StockBadge quantity={variation.availableQuantity} />
          </div>
        )}
      </div>

      <CardHeader className="gap-2 px-4 pt-4">
        <div className="flex flex-wrap gap-1.5">
          {options.length > 0 ? (
            options.map((option) => (
              <Badge
                key={`${option.attributeId}-${option.id}`}
                variant="outline"
              >
                <span className="text-muted-foreground">
                  {optionLabel(option)}:
                </span>
                <span className="font-medium">{optionValue(option)}</span>
              </Badge>
            ))
          ) : (
            <Badge variant="outline">Sin atributos</Badge>
          )}
        </div>
        <p className="font-mono text-[11px] text-muted-foreground">
          #{variation.id}
        </p>
      </CardHeader>

      <CardContent className="space-y-3 px-4 py-4">
        <p className="text-lg font-semibold tracking-tight tabular-nums">
          {formatPrice(variation.price, item.currencyId)}
        </p>

        <dl className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <dt className="flex items-center gap-1.5 text-muted-foreground">
              <Package className="h-3.5 w-3.5" />
              Stock
            </dt>
            <dd
              className={`font-semibold tabular-nums ${stockTextClass(variation.availableQuantity)}`}
            >
              {variation.availableQuantity} u.
            </dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="flex items-center gap-1.5 text-muted-foreground">
              <ShoppingCart className="h-3.5 w-3.5" />
              Vendidas
            </dt>
            <dd className="font-semibold tabular-nums">
              {variation.soldQuantity}
            </dd>
          </div>
        </dl>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Participación en ventas</span>
            <span>{share.toFixed(0)}%</span>
          </div>
          <Progress value={share} />
        </div>
      </CardContent>
    </Card>
  );
}
