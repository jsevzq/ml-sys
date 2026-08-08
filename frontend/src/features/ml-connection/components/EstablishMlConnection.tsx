import { toast } from 'sonner';
import { LinkIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { getApiErrorMessage } from '@/lib/api-error';
import { useRequestMlAuthUrl } from '../api/useConnectMl';
import { MlManualCallbackForm } from './MlManualCallbackForm';

/**
 * Vinculación en dos pasos. El segundo es manual a propósito: Mercado Libre no
 * acepta `localhost` como redirect_uri, así que la redirección muere en una URL
 * que no resuelve y hay que traer `code` y `state` a mano.
 */
export function EstablishMlConnection() {
  const requestAuthUrl = useRequestMlAuthUrl();

  return (
    <Card className="w-full max-w-xl text-left">
      <CardHeader>
        <CardTitle>Vincular cuenta de Mercado Libre</CardTitle>
        <CardDescription>
          Se requiere su autorización para leer las publicaciones y las ventas.
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-6">
        <div className="space-y-2">
          <p className="text-sm font-medium">1. Autorizá en Mercado Libre</p>
          <p className="text-sm text-muted-foreground">
            El botón abre Mercado Libre. Al autorizar, redirige a una dirección
            que no carga: es el comportamiento esperado mientras no haya un
            dominio configurado. Copie esa URL de la barra de direcciones.
          </p>
          <Button
            size="lg"
            onClick={() =>
              requestAuthUrl.mutate(undefined, {
                onError: (error) =>
                  toast.error(
                    getApiErrorMessage(
                      error,
                      'No se pudo iniciar la vinculación',
                    ),
                  ),
              })
            }
            disabled={requestAuthUrl.isPending}
          >
            <LinkIcon />
            {requestAuthUrl.isPending
              ? 'Conectando...'
              : 'Conectar con Mercado Libre'}
          </Button>
        </div>

        <Separator />

        <div className="space-y-2">
          <p className="text-sm font-medium">2. Pegue la URL de retorno</p>
          <p className="text-sm text-muted-foreground">
            Si ya autorizaste, no vuelvas a apretar el botón de arriba: cada
            intento genera un pedido nuevo e invalida el anterior.
          </p>
          <MlManualCallbackForm />
        </div>
      </CardContent>
    </Card>
  );
}
