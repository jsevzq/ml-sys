import { useQueryClient } from '@tanstack/react-query';
import {
  useAuthControllerSignIn,
  useAuthControllerSignUp,
} from '@/api/generated/auth/auth';
import { useAuthStore } from '@/features/auth/store/authStore';

/**
 * Login. Guarda el token en zustand (eso sí es estado del cliente) y limpia la
 * caché de queries para que no queden datos del usuario anterior.
 */
export const useLogin = () => {
  const setToken = useAuthStore((state) => state.setToken);
  const queryClient = useQueryClient();

  return useAuthControllerSignIn({
    mutation: {
      onSuccess: ({ access_token }) => {
        queryClient.clear();
        setToken(access_token);
      },
    },
  });
};

/** Registro. El backend ya devuelve el token, así que deja la sesión iniciada. */
export const useRegister = () => {
  const setToken = useAuthStore((state) => state.setToken);
  const queryClient = useQueryClient();

  return useAuthControllerSignUp({
    mutation: {
      onSuccess: ({ access_token }) => {
        queryClient.clear();
        setToken(access_token);
      },
    },
  });
};
