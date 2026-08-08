import { Test, TestingModule } from '@nestjs/testing';
import { MlController } from './ml.controller';
import { MlService } from './ml.service';
import type { AuthenticatedRequest } from '../auth/auth.guard';

const request = (sub: number) =>
  ({ user: { sub, email: 'user@mail.com' } }) as AuthenticatedRequest;

describe('MlController', () => {
  let controller: MlController;
  const mlService = {
    generateAuthUrl: jest.fn(),
    getConnectionStatus: jest.fn(),
    exchangeCodeForToken: jest.fn(),
    fetchSellerItems: jest.fn(),
    fetchAndSaveDetailedItems: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MlController],
      providers: [{ provide: MlService, useValue: mlService }],
    }).compile();

    controller = module.get<MlController>(MlController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('pasa el sub del JWT como string al service', async () => {
    mlService.generateAuthUrl.mockResolvedValue('https://auth.ml/...');

    await controller.getIntegrationLink(request(2));

    expect(mlService.generateAuthUrl).toHaveBeenCalledWith('2');
  });

  it('resume la sincronización en found/saved/notSaved', async () => {
    mlService.fetchSellerItems.mockResolvedValue(['MLU1', 'MLU2', 'MLU3']);
    mlService.fetchAndSaveDetailedItems.mockResolvedValue(['MLU3']);

    await expect(controller.sync(request(2))).resolves.toEqual({
      found: 3,
      saved: 2,
      notSaved: ['MLU3'],
    });
  });

  it('canjea el code contra el usuario autenticado', async () => {
    mlService.exchangeCodeForToken.mockResolvedValue({
      success: true,
      name: 'VENDEDOR1234',
      email: 'vendedor@mail.com',
    });

    await controller.connectAccount(request(7), {
      code: 'TG-123',
      state: 'abc',
    });

    expect(mlService.exchangeCodeForToken).toHaveBeenCalledWith(
      'TG-123',
      'abc',
      '7',
    );
  });
});
