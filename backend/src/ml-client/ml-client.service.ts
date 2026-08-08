import { HttpService } from '@nestjs/axios';
import {
  HttpException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { isAxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';
import { MlTokenResponse } from './interfaces/ml-token-response.interface';

interface MlErrorBody {
  message?: string;
  error?: string;
  status?: number;
  cause?: unknown;
}

@Injectable()
export class MlClientService {
  private readonly logger = new Logger(MlClientService.name);
  private readonly baseUrl = 'https://api.mercadolibre.com';

  constructor(private readonly httpService: HttpService) {}

  async exchangeCode(code: string): Promise<MlTokenResponse> {
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: process.env.ML_CLIENT_ID!,
      client_secret: process.env.ML_CLIENT_SECRET!,
      code,
      redirect_uri: process.env.ML_REDIRECT_URI!,
    });

    return this.postForm<MlTokenResponse>('/oauth/token', params);
  }

  async refreshToken(refreshToken: string): Promise<MlTokenResponse> {
    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: process.env.ML_CLIENT_ID!,
      client_secret: process.env.ML_CLIENT_SECRET!,
      refresh_token: refreshToken,
    });

    return this.postForm<MlTokenResponse>('/oauth/token', params);
  }

  async request<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    endpoint: string,
    accessToken: string,
    data?: unknown,
  ): Promise<T> {
    try {
      const response = await firstValueFrom(
        this.httpService.request<T>({
          method,
          url: `${this.baseUrl}${endpoint}`,
          data,
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }),
      );
      return response.data;
    } catch (error) {
      this.handleError(error, endpoint);
    }
  }

  get<T>(endpoint: string, token: string) {
    return this.request<T>('GET', endpoint, token);
  }
  post<T>(endpoint: string, token: string, data: unknown) {
    return this.request<T>('POST', endpoint, token, data);
  }

  private async postForm<T>(
    endpoint: string,
    params: URLSearchParams,
  ): Promise<T> {
    try {
      const response = await firstValueFrom(
        this.httpService.post<T>(
          `${this.baseUrl}${endpoint}`,
          params.toString(),
          {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          },
        ),
      );
      return response.data;
    } catch (error) {
      this.handleError(error, endpoint);
    }
  }

  private handleError(error: unknown, endpoint: string): never {
    if (!isAxiosError(error)) {
      this.logger.error(
        `[ML ${endpoint}] error inesperado`,
        error instanceof Error ? error.stack : String(error),
      );
      throw new InternalServerErrorException(
        `Error inesperado al llamar a Mercado Libre (${endpoint})`,
      );
    }

    const upstreamStatus = error.response?.status;
    const body = error.response?.data as MlErrorBody | undefined;
    const detail = body?.message ?? body?.error ?? error.message;

    this.logger.error(
      `[ML ${endpoint}] ${upstreamStatus ?? error.code ?? 'sin respuesta'} -> ${detail}`,
      JSON.stringify(body ?? {}),
    );

    if (!upstreamStatus) {
      throw new HttpException(
        {
          message: `Mercado Libre no respondió (${endpoint}): ${error.message}`,
          mlError: error.code ?? 'NETWORK_ERROR',
        },
        HttpStatus.BAD_GATEWAY,
      );
    }

    const isAuthProblem = upstreamStatus === 401 || upstreamStatus === 403;
    const status = isAuthProblem
      ? HttpStatus.FORBIDDEN
      : upstreamStatus >= 500
        ? HttpStatus.BAD_GATEWAY
        : upstreamStatus;
    const prefix = isAuthProblem
      ? 'Mercado Libre rechazó las credenciales; hay que volver a vincular la cuenta'
      : `Mercado Libre respondió ${upstreamStatus} en ${endpoint}`;

    throw new HttpException(
      {
        message: `${prefix}: ${detail}`,
        mlStatus: upstreamStatus,
        mlError: body ?? 'ML_CLIENT_ERROR',
      },
      status,
    );
  }
}
