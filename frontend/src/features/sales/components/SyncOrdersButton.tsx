import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSyncOrders } from '../api/useSyncOrders';

export function SyncOrdersButton() {
  const sync = useSyncOrders();

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={() => sync.mutate()}
      disabled={sync.isPending}
    >
      <RefreshCw className={sync.isPending ? 'animate-spin' : undefined} />
      {sync.isPending ? 'Sincronizando...' : 'Sincronizar ventas'}
    </Button>
  );
}
