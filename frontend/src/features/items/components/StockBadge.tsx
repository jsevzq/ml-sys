import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { presentacionDeStock } from '../lib/stock-status';

/**
 * La insignia de estado de stock. Es la única forma de mostrar ese estado en toda la
 * app: si mañana cambian los umbrales o el color, se cambia en `stock-status.ts` y las
 * cuatro pantallas que la usan quedan iguales entre sí.
 */
export function StockBadge({
  quantity,
  className,
  withQuantity = false,
}: {
  quantity: number;
  className?: string;
  /** Suma el número al texto: "Stock bajo · 6 u.". Útil cuando no hay columna aparte. */
  withQuantity?: boolean;
}) {
  const { label, variant } = presentacionDeStock(quantity);

  return (
    <Badge variant={variant} className={cn('whitespace-nowrap', className)}>
      {label}
      {withQuantity && (
        <span className="tabular-nums opacity-80">· {quantity} u.</span>
      )}
    </Badge>
  );
}
