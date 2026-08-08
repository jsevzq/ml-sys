import { Link } from 'react-router-dom';
import {
  AlertCircle,
  ArrowUpRight,
  Boxes,
  Receipt,
  ShoppingCart,
  Tag,
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useState } from 'react';
import { TrendChart } from '@/components/charts/TrendChart';
import { RankingChart } from '@/components/charts/RankingChart';
import type { ChartConfig } from '@/components/ui/chart';
import { getApiErrorMessage } from '@/lib/api-error';
import { formatAmount, pluralize } from '@/lib/format';
import { stripCommonPrefix } from '@/lib/chart-theme';
import { useSalesSummary } from '../api/useSalesSummary';
// El costo de la mercadería y el valor del stock los sabe el módulo de
// rendimiento, que es donde se cruza la atribución con los lotes.
import { usePerformance } from '@/features/performance';
import { PeriodFilter } from '@/components/period-filter';
import { periodRange, type PeriodKey } from '@/lib/periodo';

const CURRENCY = 'UYU';

const MONTHLY_SERIES = {
  revenue: { label: 'Facturado', color: 'var(--serie-ingreso)' },
  net: { label: 'Neto liquidado', color: 'var(--serie-ganancia)' },
} satisfies ChartConfig;

const TOP_SERIES = {
  value: { label: 'Neto', color: 'var(--serie-ingreso)' },
} satisfies ChartConfig;

function Kpi({
  icon,
  label,
  amount,
  hint,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  amount: number;
  hint?: string;
  accent?: 'positivo' | 'negativo';
}) {
  const color =
    accent === 'positivo'
      ? 'text-success'
      : accent === 'negativo'
        ? 'text-destructive'
        : '';

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          {icon}
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-0.5">
        <p className={`flex items-baseline gap-1 ${color}`}>
          <span className="text-xs font-medium text-muted-foreground">
            {CURRENCY}
          </span>
          <span className="text-2xl font-semibold tabular-nums">
            {formatAmount(amount)}
          </span>
        </p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}

export function SalesDashboard() {
  const [period, setPeriod] = useState<PeriodKey>('todo');
  const { data, isPending, isError, error } = useSalesSummary(
    periodRange(period),
  );
  const { data: rendimiento } = usePerformance();

  if (isPending) {
    return (
      <div className="flex flex-col gap-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>No se pudo cargar el resumen</AlertTitle>
        <AlertDescription>{getApiErrorMessage(error)}</AlertDescription>
      </Alert>
    );
  }

  const margen = data.revenue > 0 ? (data.net / data.revenue) * 100 : 0;
  const cabeza = data.topProducts.slice(0, 8);
  const labels = stripCommonPrefix(cabeza.map((product) => product.title));
  const top = cabeza.map((product, index) => ({
    label: labels[index],
    value: product.net,
    detail: `${product.units} units`,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {pluralize(data.orders, 'venta')} en el período
        </p>
        <PeriodFilter value={period} onChange={setPeriod} />
      </div>

      {data.orders === 0 ? (
        <Alert>
          <ShoppingCart className="h-4 w-4" />
          <AlertTitle>No hay ventas en este período</AlertTitle>
          <AlertDescription>
            Pruebe con un rango más amplio, o sincronice el historial desde{' '}
            <Link to="/sales" className="underline">
              Ventas
            </Link>
            .
          </AlertDescription>
        </Alert>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Kpi
              icon={<Receipt className="h-3.5 w-3.5" />}
              label="Facturado"
              amount={data.revenue}
              hint={`${pluralize(data.orders, 'venta')} · ${pluralize(data.units, 'unidad', 'unidades')}`}
            />
            <Kpi
              icon={<ArrowUpRight className="h-3.5 w-3.5" />}
              label="Neto liquidado"
              amount={data.net}
              hint={`${margen.toFixed(1)}% de lo facturado`}
              accent="positivo"
            />
            <Kpi
              icon={<Tag className="h-3.5 w-3.5" />}
              label="Costo de lo liquidado"
              amount={rendimiento?.cogs ?? 0}
              hint="lo que costó la mercadería vendida"
              accent="negativo"
            />
            <Kpi
              icon={<Boxes className="h-3.5 w-3.5" />}
              label="Stock actual"
              amount={rendimiento?.stockValue ?? 0}
              hint="al costo, todavía sin vender"
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
            <Card>
              <CardHeader>
                <CardTitle>Facturación por mes</CardTitle>
              </CardHeader>
              <CardContent>
                <TrendChart
                  data={data.byMonth}
                  config={MONTHLY_SERIES}
                  series={['revenue', 'net']}
                  className="w-full"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Los que más neto dejan</CardTitle>
              </CardHeader>
              <CardContent>
                <RankingChart
                  rows={top}
                  config={TOP_SERIES}
                  dataKey="value"
                  className="w-full"
                />
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
