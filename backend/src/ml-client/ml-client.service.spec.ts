import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { HttpException, HttpStatus, Logger } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { MlClientService } from './ml-client.service';

const axiosError = (
  status: number | undefined,
  data?: unknown,
  message = 'Request failed',
) => ({
  isAxiosError: true,
  message,
  code: status ? undefined : 'ECONNREFUSED',
  response: status ? { status, data } : undefined,
});

describe('MlClientService', () => {
  let service: MlClientService;
  const httpService = { request: jest.fn(), post: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MlClientService,
        { provide: HttpService, useValue: httpService },
      ],
    }).compile();

    service = module.get<MlClientService>(MlClientService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('devuelve el body cuando ML responde 200', async () => {
    httpService.request.mockReturnValue(of({ data: { id: 'MLU1' } }));

    await expect(service.get('/items/MLU1', 'token')).resolves.toEqual({
      id: 'MLU1',
    });
  });

  it('traduce un 401 de ML a 403 pidiendo revincular', async () => {
    httpService.request.mockReturnValue(
      throwError(() =>
        axiosError(401, { message: 'invalid_token', error: 'not_found' }),
      ),
    );

    await expect(service.get('/users/me', 'vencido')).rejects.toMatchObject({
      status: HttpStatus.FORBIDDEN,
    });
  });

  it('traduce un 500 de ML a 502', async () => {
    httpService.request.mockReturnValue(
      throwError(() => axiosError(500, { message: 'internal error' })),
    );

    await expect(service.get('/items', 'token')).rejects.toMatchObject({
      status: HttpStatus.BAD_GATEWAY,
    });
  });

  it('conserva el status de ML para los 4xx de negocio', async () => {
    httpService.request.mockReturnValue(
      throwError(() => axiosError(404, { message: 'Item not found' })),
    );

    await expect(service.get('/items/MLU0', 'token')).rejects.toMatchObject({
      status: HttpStatus.NOT_FOUND,
    });
  });

  it('devuelve 502 y el detalle cuando ML no responde', async () => {
    httpService.request.mockReturnValue(
      throwError(() =>
        axiosError(undefined, undefined, 'connect ECONNREFUSED'),
      ),
    );

    const error = await service
      .get('/items', 'token')
      .catch((err: HttpException) => err);

    expect(error).toBeInstanceOf(HttpException);
    expect((error as HttpException).getStatus()).toBe(HttpStatus.BAD_GATEWAY);
    expect(JSON.stringify((error as HttpException).getResponse())).toContain(
      'no respondió',
    );
  });

  it('no disfraza de error de ML lo que no viene de axios', async () => {
    httpService.request.mockReturnValue(
      throwError(() => new TypeError('undefined is not a function')),
    );

    await expect(service.get('/items', 'token')).rejects.toMatchObject({
      status: HttpStatus.INTERNAL_SERVER_ERROR,
    });
  });
});
