import { type AxiosRequestConfig, type AxiosResponse } from 'axios';
// IMPORTANTE: Usa ruta relativa para evitar que Orval se pierda con los alias (@/)
import { api } from '@/services/api';

export const customInstance = async <T>(
  config: AxiosRequestConfig,
  options?: AxiosRequestConfig,
): Promise<T> => {
  return api({
    ...config,
    ...options,
  }).then((response: AxiosResponse<T>) => response.data);
};

export type ErrorType<Error> = Error;
