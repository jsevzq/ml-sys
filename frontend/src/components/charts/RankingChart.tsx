import { Bar, BarChart, LabelList, XAxis, YAxis } from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { formatPrice } from '@/lib/format';
import { shortAmount } from '@/lib/chart-theme';

export interface RankingRow {
  label: string;
  value: number;
  detail?: string;
}

interface RankingChartProps {
  rows: RankingRow[];
  config: ChartConfig;
  dataKey: string;
  currency?: string;
  className?: string;
}

/**
 * Alto por fila. Recharts apila los renglones que haga falta para la etiqueta sin
 * mirar si el de abajo se come a la fila siguiente, así que la altura del gráfico
 * no puede ser fija: con diez productos de nombre largo, un alto fijo hace que las
 * etiquetas se superpongan. Cincuenta píxeles entran tres renglones cómodos.
 */
const HEIGHT_PER_ROW = 50;

/** Tope de largo, por si aparece un título desmedido. El completo va al tooltip. */
const LARGO_MAXIMO = 42;

const truncate = (label: string) =>
  label.length <= LARGO_MAXIMO
    ? label
    : label.slice(0, LARGO_MAXIMO - 1).trimEnd() + '…';

/**
 * Barras horizontales para comparar magnitudes con nombres largos.
 *
 * Todas las barras van del mismo color: destacar las primeras codificaría en
 * color exactamente lo que ya dice la posición, y de paso sugeriría un corte
 * entre "las buenas" y "las otras" que no existe — entre la tercera y la cuarta
 * no hay ninguna diferencia de naturaleza.
 */
export function RankingChart({
  rows,
  config,
  dataKey,
  currency = 'UYU',
  className,
}: RankingChartProps) {
  const data = rows.map((row) => ({
    ...row,
    full: row.label,
    label: truncate(row.label),
  }));

  return (
    <ChartContainer
      config={config}
      className={className}
      style={{ height: Math.max(240, data.length * HEIGHT_PER_ROW) }}
    >
      <BarChart
        data={data}
        layout="vertical"
        margin={{ left: 4, right: 56, top: 4, bottom: 4 }}
        barCategoryGap={6}
      >
        <XAxis type="number" dataKey="value" hide />
        <YAxis
          type="category"
          dataKey="label"
          tickLine={false}
          axisLine={false}
          width={148}
          tickMargin={6}
          interval={0}
        />

        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent
              hideIndicator
              formatter={(value, _name, item) => (
                <div className="space-y-0.5">
                  <p className="font-medium">{item.payload.full}</p>
                  <p className="font-mono font-medium tabular-nums">
                    {formatPrice(Number(value), currency)}
                  </p>
                  {item.payload.detail && (
                    <p className="text-muted-foreground">
                      {item.payload.detail}
                    </p>
                  )}
                </div>
              )}
            />
          }
        />

        <Bar
          dataKey={dataKey}
          radius={4}
          fill={`var(--color-${dataKey})`}
          isAnimationActive={false}
        >
          <LabelList
            dataKey="value"
            position="right"
            offset={8}
            className="fill-muted-foreground"
            fontSize={11}
            formatter={(value) => shortAmount(Number(value))}
          />
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}
