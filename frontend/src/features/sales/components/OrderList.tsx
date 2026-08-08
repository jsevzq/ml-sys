import { useState } from 'react';
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Truck,
  Wrench,
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { getApiErrorMessage } from '@/lib/api-error';
import { formatDate, formatPrice } from '@/lib/format';
import { useOrders } from '../api/useOrders';
import { PeriodFilter } from '@/components/period-filter';
import { periodRange, type PeriodKey } from '@/lib/periodo';
import { SyncOrdersButton } from './SyncOrdersButton';
import { SoldProduct } from './SoldProduct';
import {
  AdjustmentDialog,
  AdjustButton,
  useAdjustmentsByTarget,
  type AdjustmentContext,
} from '@/features/business';
import {
  shippingTooltip,
  estaAnulada,
  statusLabel,
  statusVariant,
  logisticaLabel,
  unitOrder,
} from '../lib/order-display';

const PER_PAGE = 50;

export function OrderList() {
  const [offset, setOffset] = useState(0);
  const [period, setPeriod] = useState<PeriodKey>('todo');
  const [adjusting, setAdjusting] = useState<AdjustmentContext | null>(null);
  const { bySale } = useAdjustmentsByTarget();
  const { data, isPending, isError, error } = useOrders({
    limit: PER_PAGE,
    offset,
    ...periodRange(period),
  });

  // Cambiar de período con la paginación en la página 4 dejaba una tabla vacía
  // sin explicación: el offset ya no existe en el rango nuevo.
  const changePeriod = (next: PeriodKey) => {
    setPeriod(next);
    setOffset(0);
  };

  if (isPending) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-9 w-48" />
        <Card>
          <CardContent className="space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>No se pudieron cargar las ventas</AlertTitle>
        <AlertDescription>{getApiErrorMessage(error)}</AlertDescription>
      </Alert>
    );
  }

  const { results, total } = data;

  // El vacío no corta la función: si cortara, elegir un período sin ventas
  // dejaría la pantalla sin el control para volver a uno más amplio.
  if (total === 0) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-end gap-2">
          <PeriodFilter value={period} onChange={changePeriod} />
          <SyncOrdersButton />
        </div>
        <div className="flex min-h-[280px] flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-8 text-center">
          <p className="text-lg font-medium">
            {period === 'todo'
              ? 'Todavía no hay ventas'
              : 'No hay ventas en este período'}
          </p>
          <p className="text-sm text-muted-foreground">
            {period === 'todo'
              ? 'Sincronice el historial de Mercado Libre para verlo aquí.'
              : 'Pruebe con un rango más amplio.'}
          </p>
        </div>
      </div>
    );
  }

  const from = offset + 1;
  const to = Math.min(offset + results.length, total);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {from}–{to} de {total} {total === 1 ? 'venta' : 'ventas'}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <PeriodFilter value={period} onChange={changePeriod} />
          <SyncOrdersButton />
        </div>
      </div>

      <Card className="py-0">
        <CardContent className="overflow-x-auto px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Producto</TableHead>
                <TableHead className="hidden text-right sm:table-cell">
                  Cant.
                </TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="hidden text-right xl:table-cell">
                  Comisión
                </TableHead>
                <TableHead className="hidden text-right lg:table-cell">
                  Envío
                </TableHead>
                <TableHead className="text-right">Neto</TableHead>
                <TableHead className="hidden 2xl:table-cell">
                  Comprador
                </TableHead>
                <TableHead className="hidden md:table-cell">Estado</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {results.map((order) => {
                const anulada = estaAnulada(order);
                const logistica = logisticaLabel(order.shipment?.logisticType);
                const swaps = order.items.flatMap(
                  (item) => bySale.get(item.id) ?? [],
                );

                return (
                  <TableRow key={order.id}>
                    <TableCell className="whitespace-nowrap align-top">
                      {formatDate(order.dateClosed ?? order.dateCreated)}
                      <span className="block font-mono text-[11px] text-muted-foreground">
                        {order.id}
                      </span>
                    </TableCell>

                    {/* `whitespace-normal` deshace el `nowrap` que TableCell pone en
                        todas sus celdas: sin él el título estiraba la tabla más allá
                        de la pantalla en vez de envolver. El mínimo evita el extremo
                        opuesto, que las columnas numéricas lo dejen sin ancho. */}
                    <TableCell className="min-w-[200px] align-top whitespace-normal">
                      <div className="flex flex-col gap-2">
                        {swaps.map((swap) => (
                          <Tooltip key={swap.id}>
                            <TooltipTrigger asChild>
                              <Badge
                                variant="warning"
                                className="w-fit max-w-full"
                              >
                                <Wrench className="size-3 shrink-0" />
                                <span className="truncate">
                                  Se despachó{' '}
                                  {swap.targetVariantName ?? swap.targetTitle}
                                </span>
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <p>{swap.reason}</p>
                            </TooltipContent>
                          </Tooltip>
                        ))}
                        {order.items.map((item) => (
                          <SoldProduct key={item.id} item={item} />
                        ))}
                      </div>
                    </TableCell>

                    <TableCell className="hidden text-right align-top tabular-nums sm:table-cell">
                      {unitOrder(order)}
                    </TableCell>

                    <TableCell
                      className={`text-right align-top tabular-nums ${anulada ? 'line-through opacity-60' : ''}`}
                    >
                      {formatPrice(order.totalAmount, order.currencyId)}
                    </TableCell>

                    <TableCell
                      className={`hidden text-right align-top tabular-nums text-muted-foreground xl:table-cell ${anulada ? 'line-through opacity-60' : ''}`}
                    >
                      −{formatPrice(order.commissionAmount, order.currencyId)}
                    </TableCell>

                    <TableCell className="hidden text-right align-top tabular-nums text-muted-foreground lg:table-cell">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span
                            className={`inline-flex items-center gap-1 ${anulada ? 'line-through opacity-60' : ''} ${order.shippingBalance > 0 ? 'text-success' : ''}`}
                          >
                            {order.shippingBalance !== 0 && (
                              <Truck className="h-3.5 w-3.5" />
                            )}
                            {order.shippingBalance === 0
                              ? 'sin costo'
                              : `${order.shippingBalance > 0 ? '+' : '−'}${formatPrice(Math.abs(order.shippingBalance), order.currencyId)}`}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p>{shippingTooltip(order)}</p>
                        </TooltipContent>
                      </Tooltip>
                      {logistica && (
                        <span className="block text-[11px]">{logistica}</span>
                      )}
                    </TableCell>

                    <TableCell className="text-right align-top font-semibold tabular-nums">
                      {formatPrice(order.netAmount, order.currencyId)}
                    </TableCell>

                    <TableCell className="hidden align-top text-muted-foreground 2xl:table-cell">
                      {/* El apodo del comprador puede tener treinta caracteres sin
                          espacios y, al ser `nowrap`, empujaba al resto de la tabla. */}
                      <span className="block max-w-[150px] truncate">
                        {order.buyerNickname ?? '—'}
                      </span>
                    </TableCell>

                    <TableCell className="hidden align-top md:table-cell">
                      <Badge variant={statusVariant(order.status)}>
                        {statusLabel(order.status)}
                      </Badge>
                    </TableCell>

                    <TableCell className="align-top">
                      {order.items[0] && (
                        <AdjustButton
                          adjustments={swaps}
                          label="Registrar un swap"
                          onClick={() =>
                            setAdjusting({
                              source: 'venta',
                              orderItemId: order.items[0].id,
                              label: `${order.items[0].title} · venta ${order.id}`,
                              maximo: order.items[0].quantity,
                              // Si ya tiene una, el diálogo abre en edición.
                              existente: swaps[0],
                            })
                          }
                        />
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AdjustmentDialog
        context={adjusting}
        onClose={() => setAdjusting(null)}
      />

      <div className="flex items-center justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={offset === 0}
          onClick={() => setOffset(Math.max(0, offset - PER_PAGE))}
        >
          <ChevronLeft />
          Anterior
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={to >= total}
          onClick={() => setOffset(offset + PER_PAGE)}
        >
          Siguiente
          <ChevronRight />
        </Button>
      </div>
    </div>
  );
}
