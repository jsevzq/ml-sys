import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { AlertCircle, ArrowLeft } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { getApiErrorMessage } from '@/lib/api-error';
import { useConnectMlAccount } from '../api/useConnectMl';
import { MlManualCallbackForm } from './MlManualCallbackForm';

type Status = { fase: 'enviando' } | { fase: 'error'; mensaje: string };

const Centered = ({ children }: { children: React.ReactNode }) => (
  <div className="flex min-h-screen w-full items-center justify-center p-6">
    {children}
  </div>
);

/**
 * Pantalla de retorno del OAuth: canjea `code` y `state` por tokens.
 *
 * Usa `mutateAsync` + estado local a propósito: el resultado de una mutación
 * disparada desde un efecto se congela en `pending` con el doble montaje de
 * StrictMode. Ver "Mutaciones disparadas desde un efecto" en ARCHITECTURE.md.
 */
export function MlCallbackHandler() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const connect = useConnectMlAccount();

  const code = searchParams.get('code');
  const state = searchParams.get('state');

  const [status, setStatus] = useState<Status>({ fase: 'enviando' });

  // El code de ML es de un solo uso: si se canjea dos veces, el segundo intento falla.
  const yaEnviado = useRef(false);

  useEffect(() => {
    if (yaEnviado.current || !code || !state) return;
    yaEnviado.current = true;

    connect
      .mutateAsync({ data: { code, state } })
      .then((result) => {
        toast.success(`Cuenta ${result.name} vinculada correctamente`);
        navigate('/dashboard', { replace: true });
      })
      .catch((error: unknown) => {
        setStatus({
          fase: 'error',
          mensaje: getApiErrorMessage(
            error,
            'Intentá vincular la cuenta de nuevo.',
          ),
        });
      });
  }, [code, state, connect, navigate]);

  if (!code || !state) {
    return (
      <Centered>
        <Card className="w-full max-w-xl">
          <CardHeader>
            <CardTitle>Faltan los datos de la vinculación</CardTitle>
            <CardDescription>
              Esta pantalla espera el <span className="font-mono">code</span> y
              el <span className="font-mono">state</span> que devuelve Mercado
              Libre. Pegue la URL de redirección para continuar.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <MlManualCallbackForm />
            <Button asChild variant="ghost" size="sm" className="w-fit -ml-2">
              <Link to="/connect-ml">
                <ArrowLeft />
                Empezar de nuevo
              </Link>
            </Button>
          </CardContent>
        </Card>
      </Centered>
    );
  }

  if (status.fase === 'error') {
    return (
      <Centered>
        <Card className="w-full max-w-xl">
          <CardHeader>
            <CardTitle>No se pudo vincular la cuenta</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Mercado Libre rechazó la vinculación</AlertTitle>
              <AlertDescription>{status.mensaje}</AlertDescription>
            </Alert>
            <p className="text-sm text-muted-foreground">
              El <span className="font-mono">code</span> de Mercado Libre se usa
              una sola vez y la solicitud vence a los 30 minutos: debe iniciar
              nuevamente desde el botón de conexión.
            </p>
            <Button asChild className="w-fit">
              <Link to="/connect-ml">
                <ArrowLeft />
                Volver a intentar
              </Link>
            </Button>
          </CardContent>
        </Card>
      </Centered>
    );
  }

  return (
    <Centered>
      <div className="flex flex-col items-center gap-4">
        <Spinner className="h-8 w-8" />
        <p className="animate-pulse text-sm text-muted-foreground">
          Validando credenciales...
        </p>
      </div>
    </Centered>
  );
}
