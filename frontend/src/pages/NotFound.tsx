import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 p-8 text-center">
      <div>
        <p className="text-sm font-medium text-muted-foreground">Error 404</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          Esta página no existe
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Es posible que el enlace esté desactualizado o que la dirección
          contenga un error.
        </p>
      </div>
      <Button asChild size="sm">
        <Link to="/dashboard">Volver al panel</Link>
      </Button>
    </div>
  );
}
