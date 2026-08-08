import { Navigate, Outlet } from 'react-router-dom';
import { Spinner } from '@/components/ui/spinner';
import { useMlStatus } from '@/features/ml-connection';

/**
 * Deja pasar sólo si la cuenta de ML está vinculada, preguntándoselo al servidor.
 *
 * Antes esto leía un booleano de localStorage que quedaba en true aunque el token
 * de ML hubiera vencido: el usuario entraba al dashboard y recibía 403 en todo.
 */
export const MlRequiredRoute = () => {
  const { data, isPending } = useMlStatus();

  if (isPending) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  if (!data?.connected) return <Navigate to="/connect-ml" replace />;

  return <Outlet />;
};
