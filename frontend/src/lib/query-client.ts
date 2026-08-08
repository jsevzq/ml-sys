import { QueryClient } from '@tanstack/react-query';

/**
 * Configuración global de TanStack Query.
 *
 * staleTime > 0 evita que cada montaje de componente dispare un refetch: los datos
 * se consideran frescos durante ese lapso y se sirven de caché. Subilo para datos
 * que cambian poco (catálogo) y bajalo por query para los que cambian seguido.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
