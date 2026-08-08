import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  mlControllerGetIntegrationLink,
  useMlControllerConnectAccount,
  getMlControllerIsConnectedMlQueryKey,
} from '@/api/generated/ml/ml';

/**
 * Paso 1 del OAuth: pide la URL de autorización y redirige a Mercado Libre.
 *
 * Es un GET, pero lo modelamos como mutation porque se dispara por una acción del
 * usuario y tiene un efecto (navegar fuera de la app), no es un dato a cachear.
 */
export const useRequestMlAuthUrl = () =>
  useMutation({
    mutationFn: () => mlControllerGetIntegrationLink(),
    onSuccess: ({ url }) => {
      window.location.href = url;
    },
  });

/**
 * Paso 2 del OAuth: canjea el code por tokens.
 * Al terminar invalida el estado de conexión para que la app lo relea del servidor.
 */
export const useConnectMlAccount = () => {
  const queryClient = useQueryClient();

  return useMlControllerConnectAccount({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: getMlControllerIsConnectedMlQueryKey(),
        });
      },
    },
  });
};
