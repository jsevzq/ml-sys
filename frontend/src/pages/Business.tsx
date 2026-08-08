import { Link } from 'react-router';
import { ArrowRight, Wrench } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useConsistency } from '@/features/business';
import { useAdjustments } from '@/features/business/api/useAdjustments';

/**
 * Índice de las secciones de negocio.
 *
 * Antes esta página **era** las subsanaciones. Separarlas deja lugar a lo que
 * viene —gastos de la empresa, por ejemplo— sin tener que rehacer la navegación
 * el día que aparezca.
 */
export default function Business() {
  const { data: consistencia } = useConsistency();
  const { data: adjustments } = useAdjustments();

  const sinExplicar = consistencia?.units ?? 0;

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Link to="/business/adjustments" className="group">
        <Card className="h-full transition-colors group-hover:border-foreground/25">
          <CardContent className="flex h-full flex-col gap-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <Wrench className="size-4 text-muted-foreground" />
                <span className="font-semibold">Subsanaciones</span>
              </div>
              {sinExplicar > 0 ? (
                <Badge variant="warning">{sinExplicar} sin explicar</Badge>
              ) : (
                <Badge variant="success">Todo cuadra</Badge>
              )}
            </div>

            <p className="text-sm text-muted-foreground">
              Diferencias de inventario y los registros que las explican:
              destrucciones, mutaciones, swaps y equivalencias de producto.
            </p>

            <p className="mt-auto flex items-center gap-1.5 text-sm font-medium">
              {adjustments?.length ?? 0} registradas
              <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
            </p>
          </CardContent>
        </Card>
      </Link>
    </div>
  );
}
