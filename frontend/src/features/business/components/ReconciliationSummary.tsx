import { CheckCircle2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
  useConsistency,
  useSkuEquivalences,
  useAdjustments,
} from '../api/useAdjustments';
import { summarizeAdjustments } from '../lib/adjustment-display';

function Figure({
  label,
  value,
  detail,
  className,
}: {
  label: string;
  value: string;
  detail: string;
  className?: string;
}) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn('text-2xl font-semibold tabular-nums', className)}>
        {value}
      </p>
      <p className="truncate text-xs text-muted-foreground">{detail}</p>
    </div>
  );
}

/**
 * En qué estado está la conciliación, arriba de todo.
 *
 * La pantalla abría directamente con la lista de subsanaciones: había que leerla
 * entera para saber si el inventario cerraba o no. El número que importa es uno
 * —cuántas unidades no tienen explicación— y ahora es lo primero que se ve.
 */
export function ReconciliationSummary() {
  const { data: consistencia, isPending: loadingConsistency } =
    useConsistency();
  const { data: adjustments, isPending: loadingAdjustments } = useAdjustments();
  const { data: equivalencias, isPending: loadingEquivalences } =
    useSkuEquivalences();

  if (loadingConsistency || loadingAdjustments || loadingEquivalences) {
    return <Skeleton className="h-28" />;
  }

  const sinExplicar = consistencia?.units ?? 0;
  const publicaciones = consistencia?.total ?? 0;
  const summary = summarizeAdjustments(adjustments ?? []);
  const linkedSales = (equivalencias ?? []).reduce(
    (suma, equivalencia) => suma + equivalencia.affectedSales,
    0,
  );

  return (
    <Card size="sm">
      <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">Sin explicar</p>
          {sinExplicar === 0 ? (
            <>
              <p className="flex items-center gap-2 text-2xl font-semibold tabular-nums text-success">
                <CheckCircle2 className="size-5" />0
              </p>
              <p className="truncate text-xs text-muted-foreground">
                el inventario cierra
              </p>
            </>
          ) : (
            <>
              <p className="text-2xl font-semibold tabular-nums text-warning">
                {sinExplicar} {sinExplicar === 1 ? 'unidad' : 'u.'}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                en {publicaciones}{' '}
                {publicaciones === 1 ? 'publicación' : 'publicaciones'}
              </p>
            </>
          )}
        </div>

        <Figure
          label="Subsanaciones"
          value={String(summary.total)}
          detail={`${summary.units} ${summary.units === 1 ? 'unidad explicada' : 'unidades explicadas'}`}
        />

        <Figure
          label="Salidas sin venta"
          value={String(summary.byKind.destruction.units)}
          detail="rotura, uso propio o pérdida"
        />

        <Figure
          label="Equivalencias"
          value={String((equivalencias ?? []).length)}
          detail={`${linkedSales} ${linkedSales === 1 ? 'venta pasa' : 'ventas pasan'} por ellas`}
        />
      </CardContent>
    </Card>
  );
}
