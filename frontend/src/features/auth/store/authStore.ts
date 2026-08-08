import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Estado del CLIENTE únicamente: el token de sesión.
 *
 * Todo lo que vive en el backend (si ML está conectado, el nickname de la cuenta,
 * el catálogo) es estado del SERVIDOR y va en TanStack Query, no acá: una copia
 * local de eso nadie la invalida, y la aplicación terminaría creyéndose conectada
 * con el token ya vencido.
 */
interface AuthState {
  token: string | null;
  setToken: (token: string | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      setToken: (token) => set({ token }),
      logout: () => set({ token: null }),
    }),
    {
      name: 'auth-storage',
    },
  ),
);
