import { useState } from 'react';
import { ChevronDown, ChevronUp, Pencil, Trash2, Wrench } from 'lucide-react';
import {
  AdjustButton,
  AdjustmentSummary,
  useAdjustmentsByTarget,
} from '@/features/business';
import type {
  ImportationDto,
  ImportationProductDto,
} from '@/api/generated/models';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
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
import { formatCalendarDate, formatPrice } from '@/lib/format';
import { FALLBACK_IMAGE } from '@/features/items/lib/item-display';

const CURRENCY = 'UYU';
const MINIATURAS_VISIBLES = 6;

function colorDeAvance(percentage: number) {
  if (percentage >= 80) return 'bg-success';
  if (percentage >= 40) return 'bg-warning';
  return 'bg-primary';
}

function Miniatura({ src, alt }: { src?: string | null; alt: string }) {
  const [source, setSource] = useState(src ?? FALLBACK_IMAGE);

  return (
    <img
      src={source}
      alt={alt}
      onError={() => setSource(FALLBACK_IMAGE)}
      className="size-9 shrink-0 rounded-full bg-muted object-contain ring-2 ring-card"
    />
  );
}

function Figure({
  label,
  value,
  detail,
  className,
}: {
  label: string;
  value: string;
  detail?: string;
  className?: string;
}) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`truncate font-semibold tabular-nums ${className ?? ''}`}>
        {value}
      </p>
      {detail && (
        <p className="truncate text-xs text-muted-foreground">{detail}</p>
      )}
    </div>
  );
}

/**
 * Lo que se esperaba ganar con el lote, y cuánto de eso ya entró.
 *
 * El número se congela cuando se carga la importación, así que la barra contra lo
 * generado es la comparación que importa: no mide avance de ventas, mide si el lote
 * está cumpliendo lo que prometía cuando se compró.
 */
function ExpectedProfit({
  importation,
  generado,
}: {
  importation: ImportationDto;
  generado?: number;
}) {
  if (importation.expectedNetUYU <= 0) {
    return <Figure label="Ganancia esperada" value="—" detail="sin estimar" />;
  }

  const cumplido =
    generado === undefined
      ? null
      : Math.round((generado / importation.expectedNetUYU) * 100);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="min-w-0 text-left">
          <Figure
            label="Ganancia esperada"
            value={formatPrice(importation.expectedProfitUYU, CURRENCY)}
            detail={
              cumplido === null
                ? `${Math.round(importation.expectedRoi)}% sobre lo invertido`
                : `${cumplido}% cumplido · ${Math.round(importation.expectedRoi)}% de retorno`
            }
            className={
              importation.expectedProfitUYU > 0 ? 'text-success' : undefined
            }
          />
        </div>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">
        <p>
          Si se vendieran las {importation.totalUnits} units a los precios de
          lista del día que se cargó el lote, Mercado Libre depositaría{' '}
          {formatPrice(importation.expectedNetUYU, CURRENCY)}. Es una estimación
          congelada: no se actualiza cuando cambian los precios.
        </p>
      </TooltipContent>
    </Tooltip>
  );
}

interface ImportationCardProps {
  importation: ImportationDto;
  /** Neto ya liquidado por lo que salió de este lote. */
  generado?: number;
  onEdit: () => void;
  onDelete: () => void;
  onAdjust: (line: ImportationProductDto) => void;
  removing?: boolean;
}

/**
 * Un lote de un vistazo: cuándo llegó, cuánto se vendió y cuánto costó. Con
 * veinte líneas por importación, mostrar la tabla siempre abierta hace ilegible
 * la página, así que el desglose vive detrás de "Ver detalle".
 */
export function ImportationCard({
  importation,
  generado,
  onEdit,
  onDelete,
  onAdjust,
  removing,
}: ImportationCardProps) {
  const [abierta, setAbierta] = useState(false);
  const { byLine } = useAdjustmentsByTarget();
  const lotAdjustments = importation.products.flatMap(
    (product) => byLine.get(product.id) ?? [],
  );

  const restantes = importation.totalUnits - importation.soldUnits;
  const visibles = importation.products.slice(0, MINIATURAS_VISIBLES);
  const ocultas = importation.products.length - visibles.length;

  return (
    <Card>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex -space-x-2">
              {visibles.map((product) => (
                <Tooltip key={product.id}>
                  <TooltipTrigger asChild>
                    <span>
                      <Miniatura
                        src={product.imageUrl}
                        alt={product.variantName ?? product.title ?? ''}
                      />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>
                      {product.title}
                      {product.variantName ? ` · ${product.variantName}` : ''}
                      {` · ${product.quantity} u.`}
                    </p>
                  </TooltipContent>
                </Tooltip>
              ))}
              {ocultas > 0 && (
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium ring-2 ring-card">
                  +{ocultas}
                </span>
              )}
            </div>

            <div className="min-w-0">
              <p className="flex flex-wrap items-center gap-2 font-semibold">
                Llegada {formatCalendarDate(importation.arrivalDate)}
                {lotAdjustments.length > 0 && (
                  <Badge variant="warning" className="h-5 gap-1">
                    <Wrench className="size-3" />
                    {lotAdjustments.length}{' '}
                    {lotAdjustments.length === 1
                      ? 'subsanación'
                      : 'subsanaciones'}
                  </Badge>
                )}
              </p>
              <p className="text-xs text-muted-foreground">
                comprada el {formatCalendarDate(importation.orderDate)} ·{' '}
                {importation.products.length}{' '}
                {importation.products.length === 1 ? 'producto' : 'productos'}
              </p>
            </div>
          </div>

          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Editar importación"
              onClick={onEdit}
            >
              <Pencil />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Eliminar importación"
              disabled={removing}
              onClick={onDelete}
            >
              <Trash2 />
            </Button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="min-w-0 space-y-1.5">
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-xs text-muted-foreground">Vendido</p>
              <p className="text-xs font-semibold tabular-nums">
                {importation.soldPercentage}%
              </p>
            </div>
            <Progress
              value={importation.soldPercentage}
              indicatorClassName={colorDeAvance(importation.soldPercentage)}
            />
            <p className="text-xs text-muted-foreground">
              {importation.soldUnits} de {importation.totalUnits} units
            </p>
          </div>

          <Figure
            label="Quedan"
            value={`${restantes} u.`}
            className={restantes === 0 ? 'text-muted-foreground' : undefined}
          />

          <Figure
            label="Generado"
            value={generado === undefined ? '—' : formatPrice(generado, CURRENCY)}
            detail={
              generado !== undefined && importation.investedUYU > 0
                ? `${Math.round((generado / importation.investedUYU) * 100)}% de lo invertido`
                : 'neto de lo vendido'
            }
            className={
              generado !== undefined && generado >= importation.investedUYU
                ? 'text-success'
                : undefined
            }
          />

          <Figure
            label="Invertido"
            value={formatPrice(importation.investedUYU, CURRENCY)}
            detail={
              importation.additionalUYU > 0
                ? `incluye ${formatPrice(importation.additionalUYU, CURRENCY)} de costos`
                : 'sin costos adicionales'
            }
          />

          <ExpectedProfit importation={importation} generado={generado} />
        </div>

        <Button
          variant="ghost"
          size="sm"
          className="-ml-2"
          onClick={() => setAbierta((value) => !value)}
        >
          {abierta ? <ChevronUp /> : <ChevronDown />}
          {abierta ? 'Ocultar detail' : 'Ver detail'}
        </Button>

        {abierta && (
          <div className="space-y-4">
            <Separator />

            {importation.additionalCosts.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {importation.additionalCosts.map((cost) => (
                  <Badge key={cost.id} variant="outline" className="h-6">
                    {cost.typeName}:{' '}
                    {cost.kind === 'percentage'
                      ? `${cost.amount}%`
                      : `${cost.amount} ${cost.currency ?? ''}`}
                    <span className="text-muted-foreground">
                      = {formatPrice(cost.amountUYU, CURRENCY)}
                    </span>
                  </Badge>
                ))}
              </div>
            )}

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead className="text-right">Compradas</TableHead>
                    <TableHead className="text-right">Vendidas</TableHead>
                    <TableHead className="text-right">Quedan</TableHead>
                    <TableHead className="text-right">Mercadería</TableHead>
                    <TableHead className="text-right">Adicionales</TableHead>
                    <TableHead className="text-right">Costo unitario</TableHead>
                    <TableHead className="text-right">Esperado</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {importation.products.map((product) => (
                    <TableRow key={product.id}>
                      {/* Los títulos de Mercado Libre son largos y, sin un techo,
                          empujan las columnas de plata fuera del área visible. */}
                      <TableCell className="max-w-[20rem]">
                        <div className="flex items-center gap-2">
                          <Miniatura
                            src={product.imageUrl}
                            alt={product.variantName ?? ''}
                          />
                          <div className="min-w-0">
                            {/* Envuelve en vez de truncar: el calibre va al final
                                del título ("… - 0.30mm") y es lo que separa un
                                producto de otro, así que cortarlo ahí los vuelve
                                indistinguibles. */}
                            <p className="font-medium leading-snug text-balance">
                              {product.generatedByAdjustmentId !== null && (
                                <Badge variant="outline" className="mr-1.5 h-5">
                                  Mutado
                                </Badge>
                              )}
                              {product.title ?? product.itemId}
                            </p>
                            {/* El color va en su propia línea y no pegado al
                                título: es lo que distingue una fila de otra, y
                                si comparte renglón con un título largo se corta
                                justo él. */}
                            <p className="truncate text-[11px] text-muted-foreground">
                              {product.variantName && (
                                <span className="mr-1.5 font-medium text-foreground">
                                  {product.variantName}
                                </span>
                              )}
                              <span className="font-mono">
                                {product.variationId ?? product.itemId}
                              </span>
                            </p>
                            {(byLine.get(product.id) ?? []).map(
                              (adjustment) => (
                                <AdjustmentSummary
                                  key={adjustment.id}
                                  adjustment={adjustment}
                                />
                              ),
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {product.quantity}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {product.quantitySold}
                        {product.quantityAdjusted > 0 && (
                          <span
                            className="ml-1 text-[11px] text-warning"
                            title="Unidades que salieron por una subsanación"
                          >
                            +{product.quantityAdjusted}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">
                        {product.quantityRemaining}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {formatPrice(product.merchandiseCostUYU, CURRENCY)}
                        <span className="block text-[11px]">
                          {product.price} {product.currency} ×{' '}
                          {product.exchangeToUYURate}
                        </span>
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {product.additionalCostUYU > 0
                          ? formatPrice(product.additionalCostUYU, CURRENCY)
                          : '—'}
                      </TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">
                        {formatPrice(product.unitCostUYU, CURRENCY)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {product.expectedNetUYU == null ? (
                          <span className="text-muted-foreground">—</span>
                        ) : (
                          <Tooltip>
                            <TooltipTrigger className="tabular-nums">
                              {formatPrice(product.expectedNetUYU, CURRENCY)}
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>
                                {product.quantity} u. a{' '}
                                {formatPrice(
                                  product.expectedUnitPriceUYU ?? 0,
                                  CURRENCY,
                                )}
                                , ya sin la comisión
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {product.generatedByAdjustmentId === null && (
                          <AdjustButton
                            adjustments={byLine.get(product.id) ?? []}
                            label="Subsanar esta línea"
                            onClick={() => onAdjust(product)}
                          />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
