import { Test, TestingModule } from '@nestjs/testing';
import { ItemsController } from './items.controller';
import { ItemsService } from './items.service';
import { ItemDto } from './dto/item.dto';
import type { MlRequest } from '../ml/ml-connection.guard';

const ACCOUNT = 'cuenta-uuid-1';
const request = { mlAccount: { id: ACCOUNT } } as MlRequest;

describe('ItemsController', () => {
  let controller: ItemsController;
  const itemsService = {
    findAll: jest.fn<Promise<ItemDto[]>, [string]>(),
    findOne: jest.fn<Promise<ItemDto>, [string, string]>(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ItemsController],
      providers: [{ provide: ItemsService, useValue: itemsService }],
    }).compile();

    controller = module.get<ItemsController>(ItemsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('sólo publica lectura: no hay handlers de escritura', () => {
    const escritura = ['create', 'update', 'remove'];
    for (const metodo of escritura) {
      expect(metodo in controller).toBe(false);
    }
  });

  it('delega en el service pasando la cuenta dueña', async () => {
    const item = { id: 'MLU1' } as ItemDto;
    itemsService.findAll.mockResolvedValue([item]);
    itemsService.findOne.mockResolvedValue(item);

    await expect(controller.findAll(request)).resolves.toEqual([item]);
    await expect(controller.findOne('MLU1', request)).resolves.toEqual(item);
    expect(itemsService.findAll).toHaveBeenCalledWith(ACCOUNT);
    expect(itemsService.findOne).toHaveBeenCalledWith('MLU1', ACCOUNT);
  });
});
