import axios from 'axios';
import { useAuthStore } from '@/features/auth/store/authStore';
import { queryClient } from '@/lib/query-client';
import { getMlControllerIsConnectedMlQueryKey } from '@/api/generated/ml/ml';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE ?? 'http://localhost:3000',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;

    if (status === 401) {
      // Sesión inválida: cerramos y tiramos la caché para no dejar datos del usuario.
      useAuthStore.getState().logout();
      queryClient.clear();
    } else if (status === 403) {
      // El backend rechazó por falta de conexión con ML. No adivinamos el estado:
      // invalidamos la query para que la app se lo vuelva a preguntar al servidor.
      queryClient.invalidateQueries({
        queryKey: getMlControllerIsConnectedMlQueryKey(),
      });
    }

    return Promise.reject(error);
  },
);
