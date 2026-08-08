import { Link, useParams } from 'react-router-dom';
import { AlertCircle, ArrowLeft, Info } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { getApiErrorMessage } from '@/lib/api-error';
import { useItem } from '../api/useItem';
import { ItemDetailHeader } from './ItemDetailHeader';
import { VariantCard } from './VariantCard';
import { itemTotals } from '../lib/item-display';

const BackToProducts = () => (
  <Button asChild variant="ghost" size="sm" className="w-fit -ml-2">
    <Link to="/products">
      <ArrowLeft />
      Productos
    </Link>
  </Button>
);

export function ItemDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: item, isPending, isError, error } = useItem(id);

  if (isPending) {
    return (
      <div className="flex flex-col gap-6">
        <BackToProducts />
        <Card>
          <CardContent className="grid gap-6 md:grid-cols-[220px_1fr]">
            <Skeleton className="aspect-square w-full max-w-[220px] rounded-lg" />
            <div className="space-y-4">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-8 w-2/3" />
              <Skeleton className="h-4 w-1/3" />
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-72 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col gap-6">
        <BackToProducts />
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>No se pudo cargar la publicación</AlertTitle>
          <AlertDescription>
            {getApiErrorMessage(
              error,
              `La publicación ${id ?? ''} no está sincronizada. Sincronizá el catálogo desde Productos.`,
            )}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const variations = item.variations ?? [];
  const { sold } = itemTotals(item);

  return (
    <div className="flex flex-col gap-6">
      <BackToProducts />

      <ItemDetailHeader item={item} />

      <div className="flex flex-col gap-4">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-lg font-semibold">
            Variantes{variations.length > 0 ? ` (${variations.length})` : ''}
          </h2>
          {variations.length > 0 && (
            <p className="text-sm text-muted-foreground">
              Stock y ventas de cada variante de esta publicación
            </p>
          )}
        </div>

        {variations.length === 0 ? (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Esta publicación no maneja variantes</AlertTitle>
            <AlertDescription>
              Mercado Libre informa un único stock para el producto, visible más
              arriba.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {variations.map((variation) => (
              <VariantCard
                key={variation.id}
                item={item}
                variation={variation}
                totalSold={sold}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
