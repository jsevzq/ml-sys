import {
  AlertTriangle,
  CheckCircle2,
  PackageMinus,
  PackagePlus,
} from 'lucide-react';
import type { InconsistencyDto } from '@/api/generated/models';
import { InconsistencyDtoType } from '@/api/generated/models';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDate } from '@/lib/format';
import { useConsistency } from '../api/useAdjustments';

/**
 * Los tres hallazgos se distinguen por su ícono; el color dice sólo cuán grave es.
 * "Sobra en los lotes" es informativo —hay más de lo que creías— y por eso va en
 * gris: teñirlo aportaba un color más sin agregar información.
 */
const PRESENTACION = {
  [InconsistencyDtoType.sale_without_stock]: {
    icono: AlertTriangle,
    title: 'Se vendió sin stock',
    clase: 'text-warning',
  },
  [InconsistencyDtoType.surplus_in_lots]: {
    icono: PackagePlus,
    title: 'Sobra en los lotes',
    clase: 'text-muted-foreground',
  },
  [InconsistencyDtoType.missing_in_lots]: {
    icono: PackageMinus,
    title: 'Falta en los lotes',
    clase: 'text-destructive',
  },
} as const;

function Hallazgo({ hallazgo }: { hallazgo: InconsistencyDto }) {
  const { icono: Icono, title, clase } = PRESENTACION[hallazgo.type];

  return (
    <div className="flex gap-3 border-t py-3 first:border-t-0 first:pt-0">
      <Icono className={`mt-0.5 size-4 shrink-0 ${clase}`} />
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium">
            {hallazgo.title ?? hallazgo.mlVariationId ?? hallazgo.mlItemId}
          </span>
          {hallazgo.variantName && (
            <span className="text-sm text-muted-foreground">
              {hallazgo.variantName}
            </span>
          )}
          <Badge variant="outline">
            {title} · {hallazgo.units} u.
          </Badge>
        </div>

        <p className="text-sm text-muted-foreground">{hallazgo.detail}</p>

        <p className="text-xs text-muted-foreground">
          {hallazgo.systemStock !== null && (
            <>
              lotes:{' '}
              <span className="tabular-nums">{hallazgo.systemStock}</span>
              {' · '}
              Mercado Libre:{' '}
              <span className="tabular-nums">{hallazgo.mlStock}</span>
            </>
          )}
          {hallazgo.occurredAt && <>desde {formatDate(hallazgo.occurredAt)}</>}
          {(hallazgo.mlVariationId ?? hallazgo.mlItemId) && (
            <span className="ml-2 font-mono">
              {hallazgo.mlVariationId ?? hallazgo.mlItemId}
            </span>
          )}
        </p>
      </div>
    </div>
  );
}

export function ConsistencyCard() {
  const { data, isPending } = useConsistency();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Inconsistencias detectadas</CardTitle>
      </CardHeader>
      <CardContent>
        {isPending ? (
          <Skeleton className="h-24" />
        ) : !data || data.total === 0 ? (
          <p className="flex items-center gap-2 text-sm">
            <CheckCircle2 className="size-4 text-success" />
            Todo cuadra: cada unidad comprada está vendida, en stock o
            subsanada.
          </p>
        ) : (
          <div>
            {data.inconsistencies.map((hallazgo, index) => (
              <Hallazgo
                key={`${hallazgo.type}-${hallazgo.mlVariationId ?? hallazgo.mlItemId}-${index}`}
                hallazgo={hallazgo}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
