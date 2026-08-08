import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useSyncItems } from '../api/useSyncItems';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * COMPONENTE DE REFERENCIA — así se escribe un componente en esta arquitectura.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Fijate lo que NO hay acá:
 *   · ningún useState de loading / error / data
 *   · ningún useEffect
 *   · ningún try/catch ni llamada a axios
 *   · ninguna prop del tipo `onSyncComplete` para avisarle al padre
 *
 * El componente sólo pinta. Todo lo que tenga que ver con datos vive en el hook
 * de `../api/`, y el estado (isPending, error, data) sale de react-query.
 *
 * Cuando la sincronización termina, `useSyncItems` invalida la query del catálogo
 * y CUALQUIER componente montado que use `useItems()` se actualiza solo. Por eso
 * este botón no necesita saber quién muestra los items ni avisarle a nadie.
 */
export function SyncItemsButton({ className }: { className?: string }) {
  const sync = useSyncItems();

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => sync.mutate()}
      disabled={sync.isPending}
      className={className}
    >
      <RefreshCw
        className={cn('mr-2 h-4 w-4', sync.isPending && 'animate-spin')}
      />
      {sync.isPending ? 'Sincronizando...' : 'Sincronizar con ML'}
    </Button>
  );
}
