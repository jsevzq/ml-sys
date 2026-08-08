import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { getApiErrorMessage } from '@/lib/api-error';
import {
  LotProfit,
  MonthlyProfit,
  PerformanceOverview,
  ProductProfit,
  usePerformance,
} from '@/features/performance';

export default function Performance() {
  const { data, isPending, isError, error } = usePerformance();

  return (
    <div className="flex flex-col gap-6">
      {isPending ? (
        <>
          <Skeleton className="h-40" />
          <Skeleton className="h-64" />
        </>
      ) : isError ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>No se pudo calcular el rendimiento</AlertTitle>
          <AlertDescription>{getApiErrorMessage(error)}</AlertDescription>
        </Alert>
      ) : (
        <>
          <PerformanceOverview data={data} />
          <div className="grid gap-4 xl:grid-cols-2">
            <MonthlyProfit months={data.byMonth} />
            <ProductProfit products={data.byProduct} />
          </div>
          <LotProfit lots={data.byLot} />
        </>
      )}
    </div>
  );
}
