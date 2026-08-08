import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { User } from './entities/user.entity';

describe('AuthService', () => {
  let service: AuthService;
  const repository = {
    findOneBy: jest.fn<Promise<User | null>, [Partial<User>]>(),
    create: jest.fn<User, [Partial<User>]>(),
    save: jest.fn<Promise<User>, [User]>(),
  };
  const jwtService = { signAsync: jest.fn<Promise<string>, [object]>() };

  beforeEach(async () => {
    jest.clearAllMocks();
    jwtService.signAsync.mockResolvedValue('signed.jwt.token');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: repository },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('signUp', () => {
    it('guarda la contraseña hasheada, nunca en texto plano', async () => {
      repository.create.mockImplementation((data) => data as User);
      repository.save.mockImplementation((user) =>
        Promise.resolve({ ...user, id: 1 }),
      );

      const result = await service.signUp({
        email: 'a@b.com',
        password: 'unaClave123',
      });

      const saved = repository.save.mock.calls[0][0];
      expect(saved.password).not.toBe('unaClave123');
      expect(saved.password).toMatch(/^\$2[aby]\$/);
      expect(await bcrypt.compare('unaClave123', saved.password)).toBe(true);
      expect(result).toEqual({
        id: 1,
        email: 'a@b.com',
        access_token: 'signed.jwt.token',
      });
    });

    it('traduce la violación de unicidad de email a 409', async () => {
      repository.create.mockImplementation((data) => data as User);
      const duplicated = new QueryFailedError(
        'insert',
        [],
        new Error('duplicate key'),
      );
      (duplicated as unknown as { driverError: { code: string } }).driverError =
        { code: '23505' };
      repository.save.mockRejectedValue(duplicated);

      await expect(
        service.signUp({ email: 'a@b.com', password: 'unaClave123' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('signIn', () => {
    it('devuelve un token cuando la contraseña coincide con el hash', async () => {
      const password = await bcrypt.hash('unaClave123', 10);
      repository.findOneBy.mockResolvedValue({
        id: 1,
        email: 'a@b.com',
        password,
      });

      await expect(
        service.signIn({ email: 'a@b.com', password: 'unaClave123' }),
      ).resolves.toEqual({
        access_token: 'signed.jwt.token',
      });
      expect(jwtService.signAsync).toHaveBeenCalledWith({
        sub: 1,
        email: 'a@b.com',
      });
    });

    it('rechaza una contraseña incorrecta', async () => {
      const password = await bcrypt.hash('unaClave123', 10);
      repository.findOneBy.mockResolvedValue({
        id: 1,
        email: 'a@b.com',
        password,
      });

      await expect(
        service.signIn({ email: 'a@b.com', password: 'otraClave' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rechaza un email inexistente con el mismo error que una clave incorrecta', async () => {
      repository.findOneBy.mockResolvedValue(null);

      await expect(
        service.signIn({ email: 'nadie@b.com', password: 'unaClave123' }),
      ).rejects.toThrow('Credenciales inválidas');
    });

    it('rechaza las contraseñas invalidadas por la migración', async () => {
      repository.findOneBy.mockResolvedValue({
        id: 1,
        email: 'a@b.com',
        password: 'invalidado:migracion-auth-hashing',
      });

      await expect(
        service.signIn({ email: 'a@b.com', password: 'contrasena' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });
});
