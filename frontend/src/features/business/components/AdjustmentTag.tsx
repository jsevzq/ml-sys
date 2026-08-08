import { ArrowRight, Wrench } from 'lucide-react';
import type { AdjustmentDto } from '@/api/generated/models';
import { AdjustmentDtoType } from '@/api/generated/models';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const NAME = {
  [AdjustmentDtoType.destruction]: 'Destrucción',
  [AdjustmentDtoType.mutation]: 'Mutación',
  [AdjustmentDtoType.swap]: 'Swap',
} as const;

/** Una línea con lo que se hizo, para leerla sin abrir nada. */
export function AdjustmentSummary({
  adjustment,
  className,
}: {
  adjustment: AdjustmentDto;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex flex-wrap items-center gap-1 text-[11px] text-warning ${className ?? ''}`}
    >
      <Wrench className="size-3 shrink-0" />
      <span className="font-medium">{NAME[adjustment.type]}</span>
      <span>· {adjustment.quantity} u.</span>
      {adjustment.targetTitle && (
        <>
          <ArrowRight className="size-3 shrink-0" />
          <span>{adjustment.targetVariantName ?? adjustment.targetTitle}</span>
        </>
      )}
      <span className="text-muted-foreground">· {adjustment.reason}</span>
    </span>
  );
}

/**
 * El botón para subsanar. Cuando ya hay algo cargado deja de ser un icono
 * neutro: se pinta y muestra la cuenta, para que se vea desde afuera sin tener
 * que abrir el detalle.
 */
export function AdjustButton({
  adjustments,
  onClick,
  label,
}: {
  adjustments: AdjustmentDto[];
  onClick: () => void;
  label: string;
}) {
  const marked = adjustments.length > 0;

  const boton = (
    <Button
      variant={marked ? 'secondary' : 'ghost'}
      size={marked ? 'sm' : 'icon-sm'}
      aria-label={label}
      className={
        marked
          ? 'h-7 gap-1 bg-warning/10 px-2 text-warning hover:bg-warning/20'
          : undefined
      }
      onClick={onClick}
    >
      <Wrench className={marked ? 'fill-current/20' : undefined} />
      {marked && <span className="tabular-nums">{adjustments.length}</span>}
    </Button>
  );

  if (!marked) return boton;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{boton}</TooltipTrigger>
      <TooltipContent className="max-w-xs space-y-1">
        {adjustments.map((adjustment) => (
          <p key={adjustment.id}>
            <span className="font-medium">{NAME[adjustment.type]}</span> ·{' '}
            {adjustment.quantity} u. — {adjustment.reason}
          </p>
        ))}
      </TooltipContent>
    </Tooltip>
  );
}
