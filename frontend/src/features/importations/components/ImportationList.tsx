import { useState } from 'react';
import {
  AlertCircle,
  History,
  PackagePlus,
  RefreshCw,
  Wrench,
} from 'lucide-react';
import type {
  ImportationDto,
  ImportationProductDto,
} from '@/api/generated/models';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { getApiErrorMessage } from '@/lib/api-error';
import { formatPrice } from '@/lib/format';
import { useDeleteImportation, useImportations } from '../api/useImportations';
import { useAllocation, useRecalculateAllocation } from '../api/useAllocation';
import { ImportationForm } from './ImportationForm';
import { ImportationCard } from './ImportationCard';
import { CostTypesManager } from './CostTypesManager';
import {
  AdjustmentDialog,
  useConsistency,
  useAdjustmentsByTarget,
  type AdjustmentContext,
} from '@/features/business';
import { Link } from 'react-router';
import { usePerformance } from '@/features/performance';

const CURRENCY = 'UYU';

function Summary({ importations }: { importations: ImportationDto[] }) {
  const units = importations.reduce((total, i) => total + i.totalUnits, 0);
  const sold = importations.reduce((total, i) => total + i.soldUnits, 0);
  const invested = importations.reduce((total, i) => total + i.investedUYU, 0);
  const percentage = units > 0 ? (sold / units) * 100 : 0;
  const expectedProfit = importations.reduce(
    (total, i) => total + i.expectedProfitUYU,
    0,
  );
  const retorno = invested > 0 ? (expectedProfit / invested) * 100 : 0;

  return (
    <Card size="sm">
      <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div>
          <p className="text-xs text-muted-foreground">Importaciones</p>
          <p className="text-2xl font-semibold tabular-nums">
            {importations.length}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Unidades compradas</p>
          <p className="text-2xl font-semibold tabular-nums">{units}</p>
        </div>
        <div className="space-y-1.5">
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-xs text-muted-foreground">Vendido</p>
            <p className="text-xs font-semibold tabular-nums">
              {percentage.toFixed(0)}%
            </p>
          </div>
          <p className="text-2xl font-semibold leading-none tabular-nums">
            {sold}
            <span className="text-sm font-normal text-muted-foreground">
              {' '}
              de {units}
            </span>
          </p>
          <Progress value={percentage} />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Capital invertido</p>
          <p className="text-2xl font-semibold tabular-nums">
            {formatPrice(invested, CURRENCY)}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Ganancia esperada</p>
          <p className="text-2xl font-semibold tabular-nums text-success">
            {formatPrice(expectedProfit, CURRENCY)}
          </p>
          <p className="text-xs text-muted-foreground">
            {retorno.toFixed(0)}% sobre lo invertido
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export function ImportationList() {
  const [creating, setCreating] = useState(false);
  const [editando, setEditando] = useState<ImportationDto | null>(null);
  const { data: importations, isPending, isError, error } = useImportations();
  const { data: allocation } = useAllocation();
  const { data: consistencia } = useConsistency();
  const { byLine } = useAdjustmentsByTarget();
  // Lo generado por cada lote lo calcula el módulo de rendimiento, que es donde
  // se cruza la atribución con el neto de cada venta.
  const { data: rendimiento } = usePerformance();
  const [adjusting, setAdjusting] = useState<AdjustmentContext | null>(null);
  const recalculate = useRecalculateAllocation();
  const remove = useDeleteImportation();

  if (isPending) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-28" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-44" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>No se pudieron cargar las importaciones</AlertTitle>
        <AlertDescription>{getApiErrorMessage(error)}</AlertDescription>
      </Alert>
    );
  }

  if (creating || editando) {
    return (
      <div className="flex flex-col gap-4">
        <CostTypesManager />
        <ImportationForm
          // Remontar al cambiar de lote: el formulario toma sus valores iniciales
          // del estado y no se reinicializa solo.
          key={editando?.id ?? 'nueva'}
          importation={editando ?? undefined}
          onDone={() => {
            setCreating(false);
            setEditando(null);
          }}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {importations.length}{' '}
          {importations.length === 1 ? 'importación' : 'importaciones'}
        </p>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={recalculate.isPending}
            onClick={() => recalculate.mutate()}
          >
            <RefreshCw
              className={recalculate.isPending ? 'animate-spin' : undefined}
            />
            Recalcular atribución
          </Button>
          <Button size="sm" onClick={() => setCreating(true)}>
            <PackagePlus />
            Nueva importación
          </Button>
        </div>
      </div>

      {importations.length === 0 ? (
        <div className="flex min-h-[240px] flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-8 text-center">
          <div>
            <p className="text-lg font-medium">Todavía no cargaste ninguna</p>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">
              Registre una importación con lo comprado y su fecha de arrival.
              Las ventas posteriores se descontarán de la importación más
              antigua en primer lugar.
            </p>
          </div>
          <Button size="sm" onClick={() => setCreating(true)}>
            <PackagePlus />
            Nueva importación
          </Button>
        </div>
      ) : (
        <>
          <Summary importations={importations} />

          {allocation && allocation.historicalUnits > 0 && (
            <Alert>
              <History className="h-4 w-4" />
              <AlertTitle>
                {allocation.historicalUnits} units vendidas antes del historial
                disponible
              </AlertTitle>
              <AlertDescription>
                La API de Mercado Libre sólo devuelve las ventas de los últimos
                doce meses. Esas units se deducen del total vendido que informa
                el catálogo y se descuentan de las importaciones más antiguas.
              </AlertDescription>
            </Alert>
          )}

          {consistencia && consistencia.total > 0 && (
            <Alert>
              <Wrench className="h-4 w-4" />
              <AlertTitle>
                {consistencia.units}{' '}
                {consistencia.units === 1 ? 'unidad' : 'unidades'} sin explicar
              </AlertTitle>
              <AlertDescription>
                El stock de las importaciones no coincide con el de Mercado
                Libre.{' '}
                <Link
                  className="font-medium underline"
                  to="/business/adjustments"
                >
                  Ver el detail y subsanar
                </Link>
                .
              </AlertDescription>
            </Alert>
          )}

          {importations.map((importation) => (
            <ImportationCard
              key={importation.id}
              importation={importation}
              generado={
                rendimiento?.byLot.find((lot) => lot.id === importation.id)
                  ?.revenue
              }
              onEdit={() => setEditando(importation)}
              onDelete={() => remove.mutate({ id: importation.id })}
              onAdjust={(line: ImportationProductDto) =>
                setAdjusting({
                  source: 'importacion',
                  importationProductId: line.id,
                  label: `${line.title ?? line.itemId} ${line.variantName ?? ''} · lote #${importation.id}`,
                  maximo: line.quantity,
                  // Si la línea ya tiene una, se abre para editarla.
                  existente: byLine.get(line.id)?.[0],
                })
              }
              removing={remove.isPending}
            />
          ))}

          <AdjustmentDialog
            context={adjusting}
            onClose={() => setAdjusting(null)}
          />
        </>
      )}
    </div>
  );
}
