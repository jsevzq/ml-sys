import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  Scatter,
  ScatterChart,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts';
import type {
  LotPerformanceDto,
  MonthPerformanceDto,
  ProductPerformanceDto,
} from '@/api/generated/models';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { RankingChart } from '@/components/charts/RankingChart';
import { formatCalendarDate, formatPrice } from '@/lib/format';
import {
  stripCommonPrefix,
  monthTick,
  fullMonth,
  shortAmount,
} from '@/lib/chart-theme';

const CURRENCY = 'UYU';

const MONTH_SERIES = {
  cogs: { label: 'Costo', color: 'var(--serie-costo)' },
  grossProfit: { label: 'Ganancia', color: 'var(--serie-ganancia)' },
} satisfies ChartConfig;

const PRODUCT_SERIES = {
  value: { label: 'Ganancia', color: 'var(--serie-ganancia)' },
} satisfies ChartConfig;

const LOT_SERIES = {
  recoveredPct: { label: 'Recuperado', color: 'var(--serie-ingreso)' },
} satisfies ChartConfig;

/**
 * Parte-todo en el tiempo: la columna entera es el neto del mes y el corte
 * muestra cuánto se fue en mercadería. Apilado y no dos barras al lado, porque
 * la pregunta es qué proporción queda, no cuál de los dos es más grande.
 */
export function MonthlyProfit({ months }: { months: MonthPerformanceDto[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Ganancia por mes</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={MONTH_SERIES} className="w-full">
          <BarChart data={months} margin={{ left: 4, right: 8, top: 8 }}>
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
                        {MONTH_SERIES[name as keyof typeof MONTH_SERIES]?.label}
                      </span>
                      <span className="ml-auto font-mono font-medium tabular-nums">
                        {formatPrice(Number(value), CURRENCY)}
                      </span>
                    </div>
                  )}
                />
              }
            />
            {/* El trazo del color de la tarjeta abre el corte entre los dos
                segmentos: sin él, costo y ganancia se leen como un bloque. */}
            <Bar
              dataKey="cogs"
              stackId="mes"
              fill="var(--color-cogs)"
              stroke="var(--card)"
              strokeWidth={2}
            />
            <Bar
              dataKey="grossProfit"
              stackId="mes"
              fill="var(--color-grossProfit)"
              stroke="var(--card)"
              strokeWidth={2}
              radius={[4, 4, 0, 0]}
            />
            <ChartLegend content={<ChartLegendContent />} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

export function ProductProfit({
  products,
}: {
  products: ProductPerformanceDto[];
}) {
  const cabeza = products.slice(0, 10);
  const labels = stripCommonPrefix(
    cabeza.map((product) =>
      [product.title, product.variantName?.replace('Color: ', '')]
        .filter(Boolean)
        .join(' '),
    ),
  );
  const rows = cabeza.map((product, index) => ({
    label: labels[index],
    value: product.grossProfit,
    detail: `${product.units} u. · margen ${product.marginPct}%`,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Los que más dejan</CardTitle>
      </CardHeader>
      <CardContent>
        <RankingChart
          rows={rows}
          config={PRODUCT_SERIES}
          dataKey="value"
          className="w-full"
        />
      </CardContent>
    </Card>
  );
}

/**
 * Cada lote como un punto: qué tan rápido vende contra cuánto de lo invertido ya
 * recuperó. La línea del 100 % parte el plano en dos — a la derecha están los que
 * ya se pagaron solos—, que es la lectura que una barra de progreso por fila
 * obliga a hacer de a una.
 */
type LotPoint = LotPerformanceDto & {
  arrival: string;
  unitsPerMonth: number;
};

/**
 * Tooltip propio en vez del `formatter` de `ChartTooltipContent`.
 *
 * Ese formatter se ejecuta una vez por serie del payload, y un scatter aporta tres
 * —el eje X, el eje Y y el tamaño de la burbuja—, así que la ficha del lote salía
 * repetida tres veces. Acá el punto se lee una sola vez, que es lo que corresponde:
 * las tres series describen el mismo lote, no tres cosas distintas.
 */
function LotTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: LotPoint }[];
}) {
  const lot = payload?.[0]?.payload;
  if (!active || !lot) return null;

  return (
    <div className="grid gap-1 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl">
      <p className="font-medium">Llegó el {lot.arrival}</p>
      <p className="text-muted-foreground">
        {lot.soldUnits} de {lot.units} u. · {lot.unitsPerMonth.toFixed(1)}{' '}
        u./mes
      </p>
      <p>
        Recuperado{' '}
        <span className="font-medium tabular-nums">{lot.recoveredPct}%</span> de{' '}
        {formatPrice(lot.invested, CURRENCY)}
      </p>
      <p>
        Ganancia{' '}
        <span className="font-medium tabular-nums">
          {formatPrice(lot.grossProfit, CURRENCY)}
        </span>
      </p>
    </div>
  );
}

export function LotProfit({ lots }: { lots: LotPerformanceDto[] }) {
  const points: LotPoint[] = lots.map((lot) => ({
    ...lot,
    arrival: formatCalendarDate(lot.arrivalDate),
    // El backend informa el ritmo en unidades por día, y con estos volúmenes da
    // números como 0,04 que no se leen: nadie piensa el stock en centésimas de
    // unidad. Por mes son 1,2 u., que sí es una cantidad imaginable.
    unitsPerMonth: lot.unitsPerDay * 30,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cada importación</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={LOT_SERIES} className="h-[320px] w-full">
          <ScatterChart margin={{ left: 4, right: 16, top: 12, bottom: 24 }}>
            <CartesianGrid strokeOpacity={0.35} />
            <XAxis
              type="number"
              dataKey="recoveredPct"
              name="Recuperado"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              domain={[0, 'dataMax + 20']}
              tickFormatter={(value: number) => `${Math.round(value)}%`}
              label={{
                value: 'recuperado de lo invertido',
                position: 'insideBottom',
                offset: -4,
                fontSize: 11,
                fill: 'var(--muted-foreground)',
              }}
            />
            <YAxis
              type="number"
              dataKey="unitsPerMonth"
              name="Ritmo"
              tickLine={false}
              axisLine={false}
              width={40}
              // El margen inferior despega del eje a los lotes que ya no se mueven:
              // apoyados en la línea del cero quedaban medio tapados.
              domain={[(minimo: number) => Math.min(0, minimo) - 0.4, 'auto']}
              tickFormatter={(value: number) =>
                value < 0 ? '' : value.toFixed(1)
              }
            />
            <ZAxis type="number" dataKey="invested" range={[80, 700]} />

            <ReferenceLine
              x={100}
              strokeDasharray="4 4"
              stroke="var(--muted-foreground)"
              label={{
                value: 'se pagó solo',
                position: 'top',
                fontSize: 11,
                fill: 'var(--muted-foreground)',
              }}
            />

            <ChartTooltip
              cursor={{ strokeDasharray: '3 3' }}
              content={<LotTooltip />}
            />

            <Scatter data={points} isAnimationActive={false}>
              {points.map((lot) => (
                <Cell
                  key={lot.id}
                  fill={
                    lot.recoveredPct >= 100
                      ? 'var(--serie-ganancia)'
                      : 'var(--serie-costo)'
                  }
                  fillOpacity={0.75}
                  stroke="var(--card)"
                  strokeWidth={2}
                />
              ))}
            </Scatter>
          </ScatterChart>
        </ChartContainer>

        <p className="mt-1 text-xs text-muted-foreground">
          Eje vertical: units vendidas por mes. Tamaño del punto: lo invertido.
          Verde: ya recuperado.
        </p>

        <div className="mt-4 overflow-x-auto border-t pt-2">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Llegada</TableHead>
                <TableHead className="text-right">Invertido</TableHead>
                <TableHead className="text-right">
                  Generado por sus productos
                </TableHead>
                <TableHead className="text-right">Ganancia</TableHead>
                <TableHead className="text-right">ROI</TableHead>
                <TableHead className="text-right">Se agota</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {points.map((lot) => (
                <TableRow key={lot.id}>
                  <TableCell className="whitespace-nowrap">
                    {lot.arrival}
                    <span className="ml-2 text-[11px] text-muted-foreground tabular-nums">
                      {lot.soldUnits}/{lot.units} u.
                    </span>
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {formatPrice(lot.invested, CURRENCY)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatPrice(lot.revenue, CURRENCY)}
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">
                    {formatPrice(lot.grossProfit, CURRENCY)}
                  </TableCell>
                  <TableCell
                    className={`text-right tabular-nums ${
                      lot.roi >= 0 ? 'text-success' : 'text-destructive'
                    }`}
                  >
                    {lot.roi > 0 ? '+' : ''}
                    {lot.roi}%
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap tabular-nums text-muted-foreground">
                    {lot.daysToSellOut === null
                      ? 'agotado'
                      : `${lot.daysToSellOut} días`}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
