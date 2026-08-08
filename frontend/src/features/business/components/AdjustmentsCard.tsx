import { useState } from 'react';
import { ArrowRight, Link2Off, Trash2 } from 'lucide-react';
import { Link } from 'react-router';
import type { AdjustmentDto } from '@/api/generated/models';
import type { AdjustmentDtoType } from '@/api/generated/models';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatCalendarDate } from '@/lib/format';
import {
  useDeleteSkuEquivalence,
  useDeleteAdjustment,
  useSkuEquivalences,
  useAdjustments,
} from '../api/useAdjustments';
import {
  ADJUSTMENT_KINDS,
  ADJUSTMENT_KIND,
  typeName,
  summarizeAdjustments,
} from '../lib/adjustment-display';

function Row({
  adjustment,
  onDelete,
  removing,
}: {
  adjustment: AdjustmentDto;
  onDelete: () => void;
  removing: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-t py-3 first:border-t-0 first:pt-0">
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{typeName(adjustment.type)}</Badge>
          <span className="text-sm font-medium">{adjustment.quantity} u.</span>

          <span className="truncate text-sm">
            {adjustment.sourceTitle ??
              (adjustment.orderId ? `Venta ${adjustment.orderId}` : '—')}
            {adjustment.sourceVariantName && (
              <span className="text-muted-foreground">
                {' · '}
                {adjustment.sourceVariantName}
              </span>
            )}
          </span>

          {adjustment.targetTitle && (
            <>
              <ArrowRight className="size-3.5 text-muted-foreground" />
              <span className="truncate text-sm">
                {adjustment.targetTitle}
                {adjustment.targetVariantName && (
                  <span className="text-muted-foreground">
                    {' · '}
                    {adjustment.targetVariantName}
                  </span>
                )}
              </span>
            </>
          )}
        </div>

        <p className="text-sm text-muted-foreground">{adjustment.reason}</p>

        <p className="text-xs text-muted-foreground">
          {adjustment.occurredAt && (
            <>ocurrió el {formatCalendarDate(adjustment.occurredAt)} · </>
          )}
          {adjustment.importationId ? (
            <Link className="underline" to="/importations">
              lote #{adjustment.importationId}
            </Link>
          ) : (
            <Link className="underline" to="/sales">
              ver en ventas
            </Link>
          )}
        </p>
      </div>

      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Eliminar subsanación"
        disabled={removing}
        onClick={onDelete}
      >
        <Trash2 />
      </Button>
    </div>
  );
}

type Pestaña = 'todas' | AdjustmentDtoType;

/**
 * Las subsanaciones, separadas por tipo.
 *
 * Eran una lista plana donde un swap de despacho, una reetiquetada de stock y una
 * rotura se veían igual, siendo tres cosas distintas —y sólo la última resta
 * mercadería sin ingreso—. Las pestañas las separan y, de paso, cada una explica
 * qué significa, que era jerga sin definir en ningún lado.
 */
export function AdjustmentsCard() {
  const { data, isPending } = useAdjustments();
  const remove = useDeleteAdjustment();
  const [pestaña, setPestaña] = useState<Pestaña>('todas');

  const adjustments = data ?? [];
  const summary = summarizeAdjustments(adjustments);
  const visibles =
    pestaña === 'todas'
      ? adjustments
      : adjustments.filter((s) => s.type === pestaña);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Subsanaciones</CardTitle>
        <CardDescription>
          Registros que explican la diferencia entre lo comprado y lo vendido.
          Se cargan desde el detail de una importación o desde una venta.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isPending ? (
          <Skeleton className="h-24" />
        ) : adjustments.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No hay ninguna registrada. Se crean desde el botón disponible en
            cada línea del detail de una importación o en cada venta.
          </p>
        ) : (
          <Tabs
            value={pestaña}
            onValueChange={(value) => setPestaña(value as Pestaña)}
          >
            <TabsList className="mb-3 flex-wrap">
              <TabsTrigger value="todas">
                Todas
                <span className="tabular-nums opacity-60">{summary.total}</span>
              </TabsTrigger>
              {ADJUSTMENT_KINDS.map((kind) => (
                <TabsTrigger
                  key={kind}
                  value={kind}
                  disabled={summary.byKind[kind].quantity === 0}
                >
                  {ADJUSTMENT_KIND[kind].plural}
                  <span className="tabular-nums opacity-60">
                    {summary.byKind[kind].quantity}
                  </span>
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value={pestaña} className="space-y-3">
              {pestaña !== 'todas' && (
                <p className="text-sm text-muted-foreground">
                  {ADJUSTMENT_KIND[pestaña].descripcion}{' '}
                  <span className="text-foreground">
                    {summary.byKind[pestaña].units}{' '}
                    {summary.byKind[pestaña].units === 1 ? 'unidad' : 'unidades'}
                  </span>{' '}
                  en total.
                </p>
              )}
              <div>
                {visibles.map((adjustment) => (
                  <Row
                    key={adjustment.id}
                    adjustment={adjustment}
                    removing={remove.isPending}
                    onDelete={() => remove.mutate({ id: adjustment.id })}
                  />
                ))}
              </div>
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}

export function EquivalenciasCard() {
  const { data, isPending } = useSkuEquivalences();
  const remove = useDeleteSkuEquivalence();

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>Equivalencias de producto</CardTitle>
        <CardDescription>
          Cuando Mercado Libre elimina una variante y la vuelve a crear con otro
          identificador, esta equivalencia indica que se trata del mismo
          producto y que las ventas anteriores siguen siendo válidas.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isPending ? (
          <Skeleton className="h-16" />
        ) : !data?.length ? (
          <p className="text-sm text-muted-foreground">
            No hay ninguna registrada. Sólo son necesarias cuando Mercado Libre
            cambia el identificador de una variante.
          </p>
        ) : (
          <div>
            {data.map((equivalencia) => (
              <div
                key={equivalencia.id}
                className="flex items-start justify-between gap-4 border-t py-3 first:border-t-0 first:pt-0"
              >
                <div className="min-w-0 space-y-1">
                  <p className="flex flex-wrap items-center gap-2 text-sm">
                    <Link2Off className="size-3.5 shrink-0 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      id viejo{' '}
                      <span className="font-mono text-foreground">
                        {equivalencia.fromVariationId ??
                          equivalencia.fromItemId}
                      </span>
                    </span>
                    <ArrowRight className="size-3.5 shrink-0 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      id nuevo{' '}
                      <span className="font-mono text-foreground">
                        {equivalencia.toVariationId ?? equivalencia.toItemId}
                      </span>
                    </span>
                  </p>
                  {equivalencia.reason && (
                    <p className="text-sm text-muted-foreground">
                      {equivalencia.reason}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {equivalencia.affectedSales}{' '}
                    {equivalencia.affectedSales === 1
                      ? 'venta alcanzada'
                      : 'ventas alcanzadas'}
                  </p>
                </div>

                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Eliminar equivalencia"
                  disabled={remove.isPending}
                  onClick={() => remove.mutate({ id: equivalencia.id })}
                >
                  <Trash2 />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
