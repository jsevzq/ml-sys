import { isAxiosError } from 'axios';

/**
 * Extrae el mensaje de error de una respuesta del backend.
 *
 * Nest devuelve `{ message: string | string[], error, statusCode }`, y con el
 * ValidationPipe activo `message` puede venir como array de errores de validación.
 * Centralizamos el destructuring acá para no repetir `err?.response?.data?.message`
 * en cada componente (que además no compila bajo strict, porque el error es unknown).
 */
export const getApiErrorMessage = (
  error: unknown,
  fallback = 'Ocurrió un error inesperado',
): string => {
  if (isAxiosError(error)) {
    const message = error.response?.data?.message;
    if (Array.isArray(message)) return message.join('. ');
    if (typeof message === 'string') return message;
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
};
