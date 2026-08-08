import { useMlControllerIsConnectedMl } from '@/api/generated/ml/ml';

/**
 * Estado de la vinculación con Mercado Libre.
 *
 * Es estado del SERVIDOR, no del cliente: el token de ML puede vencer sin que el
 * navegador se entere, así que nunca lo guardamos en zustand ni en localStorage.
 * La única fuente de verdad es GET /ml/status.
 */
export const useMlStatus = () =>
  useMlControllerIsConnectedMl({
    query: {
      // Más corto que el default: si el token vence queremos enterarnos pronto.
      staleTime: 30_000,
      retry: false,
    },
  });
