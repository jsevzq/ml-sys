import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { formatPrice } from '@/lib/format';
import { fullMonth, shortAmount, monthTick } from '@/lib/chart-theme';

/** Cualquier fila con un mes; las series se eligen por nombre de campo. */
export interface PuntoMensual {
  month: string;
}

interface TrendChartProps {
  data: readonly PuntoMensual[];
  config: ChartConfig;
  /** Claves a dibujar, de atrás hacia adelante. */
  series: string[];
  currency?: string;
  className?: string;
}

/**
 * Evolución mensual.
 *
 * Sólo la primera serie va rellena; las demás se dibujan como línea. Cuando las
 * series son un total y una parte de ese total —facturado y neto—, rellenar las
 * dos superpone dos manchas translúcidas y la de abajo se lee como una tercera
 * categoría. Con una sola área, el hueco entre la línea y el borde del área es
 * exactamente lo que se va en comisiones y envíos, que es la pregunta.
 */
export function TrendChart({
  data,
  config,
  series,
  currency = 'UYU',
  className,
}: TrendChartProps) {
  return (
    <ChartContainer config={config} className={className}>
      <AreaChart data={data} margin={{ left: 4, right: 8, top: 8 }}>
        <defs>
          {series.slice(0, 1).map((series) => (
            <linearGradient
              key={series}
              id={`degradado-${series}`}
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop
                offset="0%"
                stopColor={`var(--color-${series})`}
                stopOpacity={0.28}
              />
              <stop
                offset="100%"
                stopColor={`var(--color-${series})`}
                stopOpacity={0.02}
              />
            </linearGradient>
          ))}
        </defs>

        <CartesianGrid vertical={false} strokeOpacity={0.35} />

        <XAxis
          dataKey="month"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={16}
          tickFormatter={monthTick}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={44}
          tickFormatter={shortAmount}
        />

        <ChartTooltip
          content={
            <ChartTooltipContent
              labelFormatter={(_, loading) =>
                fullMonth(String(loading?.[0]?.payload?.month ?? ''))
              }
              formatter={(value, name, item) => (
                <div className="flex w-full items-center gap-2">
                  <span
                    className="size-2.5 shrink-0 rounded-[2px]"
                    style={{ background: item.color }}
                  />
                  <span className="text-muted-foreground">
                    {config[name as string]?.label ?? name}
                  </span>
                  <span className="ml-auto font-mono font-medium tabular-nums">
                    {formatPrice(Number(value), currency)}
                  </span>
                </div>
              )}
            />
          }
        />

        {series.map((series, index) => (
          <Area
            key={series}
            dataKey={series}
            type="monotone"
            stroke={`var(--color-${series})`}
            strokeWidth={2}
            fill={index === 0 ? `url(#degradado-${series})` : 'none'}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 2 }}
          />
        ))}

        {series.length > 1 && <ChartLegend content={<ChartLegendContent />} />}
      </AreaChart>
    </ChartContainer>
  );
}
