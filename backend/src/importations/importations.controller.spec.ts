import { Test, TestingModule } from '@nestjs/testing';
import { ImportationsController } from './importations.controller';
import { ImportationsService } from './importations.service';
import { StockAllocationService } from './stock-allocation.service';
import { ImportationDto } from './dto/importation.dto';
import type { MlRequest } from '../ml/ml-connection.guard';

const ACCOUNT = 'cuenta-uuid-1';
const request = { mlAccount: { id: ACCOUNT } } as MlRequest;

describe('ImportationsController', () => {
  let controller: ImportationsController;

  const importationsService = {
    findAll: jest.fn<Promise<ImportationDto[]>, [string]>(),
    findOne: jest.fn<Promise<ImportationDto>, [number, string]>(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn<Promise<void>, [number, string]>(),
  };
  const stockAllocation = { recalculate: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ImportationsController],
      providers: [
        { provide: ImportationsService, useValue: importationsService },
        { provide: StockAllocationService, useValue: stockAllocation },
      ],
    }).compile();

    controller = module.get<ImportationsController>(ImportationsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('pasa la cuenta dueña en todas las operaciones', async () => {
    importationsService.findAll.mockResolvedValue([]);
    importationsService.findOne.mockResolvedValue({ id: 3 } as ImportationDto);
    importationsService.remove.mockResolvedValue(undefined);

    await controller.findAll(request);
    await controller.findOne(3, request);
    await controller.remove(3, request);

    expect(importationsService.findAll).toHaveBeenCalledWith(ACCOUNT);
    expect(importationsService.findOne).toHaveBeenCalledWith(3, ACCOUNT);
    expect(importationsService.remove).toHaveBeenCalledWith(3, ACCOUNT);
  });

  it('expone el recálculo manual de la atribución', async () => {
    stockAllocation.recalculate.mockResolvedValue({
      allocations: 5,
      allocatedUnits: 7,
      unitsWithoutLot: 1,
    });

    await expect(controller.recalculate(request)).resolves.toMatchObject({
      allocations: 5,
    });
    expect(stockAllocation.recalculate).toHaveBeenCalledWith(ACCOUNT);
  });
});
