import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  const authService = {
    signIn: jest.fn().mockResolvedValue({ access_token: 'signed.jwt.token' }),
    signUp: jest.fn().mockResolvedValue({
      id: 1,
      email: 'a@b.com',
      access_token: 'signed.jwt.token',
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: authService }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('delega el login en AuthService', async () => {
    const credentials = { email: 'a@b.com', password: 'unaClave123' };

    await expect(controller.signIn(credentials)).resolves.toEqual({
      access_token: 'signed.jwt.token',
    });
    expect(authService.signIn).toHaveBeenCalledWith(credentials);
  });

  it('delega el registro en AuthService', async () => {
    const credentials = { email: 'a@b.com', password: 'unaClave123' };

    await expect(controller.signUp(credentials)).resolves.toEqual({
      id: 1,
      email: 'a@b.com',
      access_token: 'signed.jwt.token',
    });
    expect(authService.signUp).toHaveBeenCalledWith(credentials);
  });
});
