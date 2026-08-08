import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import {
  ForbiddenException,
  HttpException,
  HttpStatus,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { MlService } from './ml.service';
import { MlUser } from './entities/ml-user.entity';
import { ItemsService } from '../items/items.service';
import { MlClientService } from '../ml-client/ml-client.service';

const enMinutos = (minutos: number) => new Date(Date.now() + minutos * 60000);

const mlUser = (overrides: Partial<MlUser> = {}): MlUser =>
  ({
    id: 'uuid',
    userId: '2',
    mlUserId: '123456789',
    nickname: 'VENDEDOR1234',
    email: 'vendedor@mail.com',
    fullName: 'Vendedor Uno',
    accessToken: 'access',
    refreshToken: 'refresh',
    expiresAt: enMinutos(60),
    updatedAt: new Date(),
    ...overrides,
  }) as MlUser;

describe('MlService', () => {
  let service: MlService;
  const repository = {
    findOneBy: jest.fn<Promise<MlUser | null>, [object]>(),
    create: jest.fn<MlUser, [object]>(),
    save: jest.fn<Promise<MlUser>, [MlUser]>(),
    update: jest.fn<Promise<unknown>, [string, object]>(),
  };
  const itemsService = {
    upsertMany: jest.fn<Promise<void>, [unknown[], string]>(),
  };
  const mlClientService = {
    get: jest.fn(),
    exchangeCode: jest.fn(),
    refreshToken: jest.fn(),
  };
  const cacheManager = { get: jest.fn(), set: jest.fn(), del: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    itemsService.upsertMany.mockResolvedValue(undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MlService,
        { provide: getRepositoryToken(MlUser), useValue: repository },
        { provide: ItemsService, useValue: itemsService },
        { provide: MlClientService, useValue: mlClientService },
        { provide: CACHE_MANAGER, useValue: cacheManager },
      ],
    }).compile();

    service = module.get<MlService>(MlService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findOneByUserId', () => {
    it('explica que no hay cuenta vinculada en vez de un 404 vacío', async () => {
      repository.findOneBy.mockResolvedValue(null);

      await expect(service.findOneByUserId('2')).rejects.toBeInstanceOf(
        NotFoundException,
      );
      await expect(service.findOneByUserId('2')).rejects.toThrow(
        /cuenta de Mercado Libre vinculada/,
      );
    });
  });

  describe('exchangeCodeForToken', () => {
    it('rechaza un state que no coincide sin llamar a ML', async () => {
      cacheManager.get.mockResolvedValue('esperado');

      await expect(
        service.exchangeCodeForToken('code', 'otro', '2'),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(mlClientService.exchangeCode).not.toHaveBeenCalled();
    });

    it('propaga el error del cliente de ML en vez de un 400 genérico', async () => {
      cacheManager.get.mockResolvedValue('state');
      mlClientService.exchangeCode.mockRejectedValue(
        new HttpException('ML dijo invalid_grant', HttpStatus.BAD_REQUEST),
      );

      const error = await service
        .exchangeCodeForToken('code', 'state', '2')
        .catch((err: HttpException) => err);

      expect((error as HttpException).message).toBe('ML dijo invalid_grant');
    });
  });

  describe('validateAndRefreshToken', () => {
    it('devuelve false si el usuario no tiene cuenta vinculada', async () => {
      repository.findOneBy.mockResolvedValue(null);

      await expect(service.validateAndRefreshToken('2')).resolves.toEqual({
        status: false,
      });
    });

    it('no refresca si el token todavía es válido', async () => {
      repository.findOneBy.mockResolvedValue(mlUser());

      await expect(service.validateAndRefreshToken('2')).resolves.toEqual({
        status: true,
      });
      expect(mlClientService.refreshToken).not.toHaveBeenCalled();
    });

    it('refresca y persiste cuando está por vencer', async () => {
      const entry = mlUser({ expiresAt: enMinutos(1) });
      repository.findOneBy.mockResolvedValue(entry);
      mlClientService.refreshToken.mockResolvedValue({
        access_token: 'nuevo',
        refresh_token: 'nuevo-refresh',
        expires_in: 21600,
      });

      await expect(service.validateAndRefreshToken('2')).resolves.toEqual({
        status: true,
      });
      expect(repository.save.mock.calls[0][0].accessToken).toBe('nuevo');
    });

    it('pide revincular cuando el refresh token también venció', async () => {
      repository.findOneBy.mockResolvedValue(
        mlUser({ expiresAt: enMinutos(1) }),
      );
      mlClientService.refreshToken.mockRejectedValue(
        new HttpException('invalid_grant', HttpStatus.FORBIDDEN),
      );

      await expect(service.validateAndRefreshToken('2')).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    // Sin la marca se reintentaba el refresh en cada request y la cuenta seguía
    // figurando conectada hasta que algo reventaba con un 403.
    it('deja marcada la cuenta cuando ML rechaza el refresh', async () => {
      repository.findOneBy.mockResolvedValue(
        mlUser({ expiresAt: enMinutos(1) }),
      );
      mlClientService.refreshToken.mockRejectedValue(
        new HttpException('invalid_grant', HttpStatus.FORBIDDEN),
      );

      await expect(service.validateAndRefreshToken('2')).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(repository.update).toHaveBeenCalledTimes(1);
      const [, changes] = repository.update.mock.calls[0];
      expect(changes).toEqual<Partial<MlUser>>({
        disconnectedAt: expect.any(Date) as Date,
      });
    });

    it('limpia la marca cuando el refresh vuelve a funcionar', async () => {
      repository.findOneBy.mockResolvedValue(
        mlUser({ expiresAt: enMinutos(1), disconnectedAt: new Date() }),
      );
      mlClientService.refreshToken.mockResolvedValue({
        access_token: 'nuevo',
        refresh_token: 'nuevo-refresh',
        expires_in: 21600,
      });

      await service.validateAndRefreshToken('2');
      expect(repository.save.mock.calls[0][0].disconnectedAt).toBeNull();
    });
  });

  describe('getConnectionStatus', () => {
    it('reporta desconectado en vez de romper si el refresh falla', async () => {
      repository.findOneBy.mockResolvedValue(
        mlUser({ expiresAt: enMinutos(1) }),
      );
      mlClientService.refreshToken.mockRejectedValue(
        new HttpException('invalid_grant', HttpStatus.FORBIDDEN),
      );

      await expect(service.getConnectionStatus('2')).resolves.toEqual({
        connected: false,
        disconnectedAt: null,
      });
    });
  });

  describe('fetchAndSaveDetailedItems', () => {
    it('guarda los items OK y devuelve los que ML rechazó', async () => {
      repository.findOneBy.mockResolvedValue(mlUser());
      mlClientService.get.mockResolvedValue([
        { code: 200, body: { id: 'MLU1' } },
        { code: 403, body: { id: 'MLU2', message: 'forbidden' } },
      ]);

      const notSaved = await service.fetchAndSaveDetailedItems('2', [
        'MLU1',
        'MLU2',
      ]);

      expect(notSaved).toEqual(['MLU2']);
      expect(itemsService.upsertMany.mock.calls[0][0]).toHaveLength(1);
    });

    it('guarda los items a nombre de la cuenta de ML dueña', async () => {
      repository.findOneBy.mockResolvedValue(mlUser({ id: 'cuenta-1' }));
      mlClientService.get.mockResolvedValue([
        { code: 200, body: { id: 'MLU1' } },
      ]);

      await service.fetchAndSaveDetailedItems('2', ['MLU1']);

      expect(itemsService.upsertMany.mock.calls[0][1]).toBe('cuenta-1');
    });

    it('nombra el lote cuando falla el guardado', async () => {
      repository.findOneBy.mockResolvedValue(mlUser());
      mlClientService.get.mockResolvedValue([
        { code: 200, body: { id: 'MLU1' } },
      ]);
      itemsService.upsertMany.mockRejectedValue(new Error('columna nula'));

      await expect(
        service.fetchAndSaveDetailedItems('2', ['MLU1']),
      ).rejects.toThrow('MLU1');
    });
  });
});
