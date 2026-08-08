import type { PerformanceReportDto } from '@/api/generated/models';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { formatAmount } from '@/lib/format';

const CURRENCY = 'UYU';

/**
 * Un número de la cascada. Si es plata, la moneda va aparte y en chico: repetida
 * seis veces al tamaño del titular no aporta nada y forzaba a los importes a
 * partirse en dos líneas, dejando la fila con las bases desalineadas.
 */
function Kpi({
  label,
  amount,
  value,
  signo,
  detail,
  destacado,
}: {
  label: string;
  amount?: number;
  /** Para lo que no es plata, como el ROI. */
  value?: string;
  signo?: string;
  detail?: string;
  destacado?: 'bueno' | 'malo';
}) {
  const color =
    destacado === 'bueno'
      ? 'text-success'
      : destacado === 'malo'
        ? 'text-destructive'
        : '';

  return (
    <div className="min-w-0">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`flex items-baseline gap-1 ${color}`}>
        {amount !== undefined && (
          <span className="text-xs font-medium text-muted-foreground">
            {signo}
            {CURRENCY}
          </span>
        )}
        <span className="text-xl font-semibold tabular-nums">
          {amount !== undefined ? formatAmount(amount) : value}
        </span>
      </p>
      {detail && <p className="text-xs text-muted-foreground">{detail}</p>}
    </div>
  );
}

/**
 * La cascada de la plata: de lo que entró a lo que quedó. Es lo que el dashboard
 * de ventas no puede mostrar, porque ahí no se sabe cuánto costó la mercadería.
 */
export function PerformanceOverview({ data }: { data: PerformanceReportDto }) {
  const recovered =
    data.invested > 0 ? (data.revenue / data.invested) * 100 : 0;

  return (
    <Card>
      <CardContent className="space-y-5">
        <div className="grid gap-x-6 gap-y-5 sm:grid-cols-3 xl:grid-cols-6">
          <Kpi
            label="Neto liquidado"
            amount={data.revenue}
            detail={`${data.soldUnits} unidades, sin comisión ni envío`}
          />
          <Kpi
            label="Costo de lo vendido"
            amount={data.cogs}
            signo="−"
            detail="puesto en depósito"
          />
          <Kpi
            label="Ganancia bruta"
            amount={data.grossProfit}
            detail={`margen ${data.marginPct}%`}
            destacado={data.grossProfit >= 0 ? 'bueno' : 'malo'}
          />
          <Kpi
            label="Invertido"
            amount={data.invested}
            detail="en todas las importaciones"
          />
          <Kpi
            label="Todavía en stock"
            amount={data.stockValue}
            detail="al costo, sin vender"
          />
          <Kpi
            label="ROI"
            value={`${data.roi}%`}
            detail="ganancia sobre lo invertido"
            destacado={data.roi >= 0 ? 'bueno' : 'malo'}
          />
        </div>

        <div className="grid gap-5 border-t pt-4 md:grid-cols-2">
          {/* Qué proporción del neto se queda como ganancia. */}
          <div className="space-y-1.5">
            <Progress
              value={Math.max(0, Math.min(100, data.marginPct))}
              indicatorClassName="bg-success"
            />
            <p className="text-xs text-muted-foreground">
              De cada 100 pesos que deposita Mercado Libre, quedan{' '}
              <span className="font-medium tabular-nums">
                {data.marginPct.toFixed(0)}
              </span>
              .
            </p>
          </div>

          <div className="space-y-1.5">
            <Progress
              value={Math.max(0, Math.min(100, recovered))}
              indicatorClassName={
                recovered >= 100 ? 'bg-success' : 'bg-warning'
              }
            />
            <p className="text-xs text-muted-foreground">
              Se recuperó el{' '}
              <span className="font-medium tabular-nums">
                {recovered.toFixed(0)}%
              </span>{' '}
              de lo invertido
              {recovered >= 100
                ? ': el capital está recuperado y lo demás es ganancia.'
                : '.'}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
