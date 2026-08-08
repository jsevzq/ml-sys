import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ImportationsService } from './importations.service';
import { StockAllocationService } from './stock-allocation.service';
import { Importation } from './entities/importation.entity';
import { ImportationProduct } from './entities/importation-product.entity';
import {
  AdditionalCost,
  AdditionalCostKind,
} from './entities/additional-cost.entity';
import { AdditionalCostType } from './entities/additional-cost-type.entity';
import { Item } from '../items/entities/item.entity';
import { Variation } from '../items/entities/variation.entity';

const ACCOUNT = 'cuenta-uuid-1';

const line = (over: Record<string, unknown> = {}) => ({
  itemId: 'MLU1',
  quantity: 10,
  price: 4.35,
  currency: 'usd',
  exchangeToUYURate: 40.5,
  ...over,
});

describe('ImportationsService', () => {
  let service: ImportationsService;

  const transaction = jest.fn();
  const importationRepository = {
    save: jest.fn<Promise<{ id: number }>, [Record<string, unknown>]>(),
    create: jest.fn((data: unknown) => data),
    find: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
    manager: { transaction },
  };
  const productRepository = { create: jest.fn((data: unknown) => data) };
  const costRepository = {
    create: jest.fn<Record<string, unknown>, [Record<string, unknown>]>(
      (data) => data,
    ),
  };
  const costTypeRepository = { find: jest.fn() };
  const itemRepository = { find: jest.fn() };
  const variationRepository = { find: jest.fn() };
  const stockAllocation = { recalculate: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    itemRepository.find.mockResolvedValue([{ id: 'MLU1' }]);
    costTypeRepository.find.mockResolvedValue([{ id: 1 }]);
    variationRepository.find.mockResolvedValue([{ id: 'V1' }]);
    stockAllocation.recalculate.mockResolvedValue({
      allocations: 0,
      allocatedUnits: 0,
      unitsWithoutLot: 0,
      historicalUnits: 0,
    });
    importationRepository.save.mockResolvedValue({ id: 7 });
    importationRepository.findOne.mockResolvedValue({
      id: 7,
      orderDate: new Date('2026-03-01'),
      arrivalDate: new Date('2026-04-01'),
      products: [],
      additionalCosts: [],
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ImportationsService,
        {
          provide: getRepositoryToken(Importation),
          useValue: importationRepository,
        },
        {
          provide: getRepositoryToken(ImportationProduct),
          useValue: productRepository,
        },
        {
          provide: getRepositoryToken(AdditionalCost),
          useValue: costRepository,
        },
        {
          provide: getRepositoryToken(AdditionalCostType),
          useValue: costTypeRepository,
        },
        { provide: getRepositoryToken(Item), useValue: itemRepository },
        {
          provide: getRepositoryToken(Variation),
          useValue: variationRepository,
        },
        { provide: StockAllocationService, useValue: stockAllocation },
      ],
    }).compile();

    service = module.get<ImportationsService>(ImportationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('guarda la importación a nombre de la cuenta dueña', async () => {
      await service.create(
        {
          orderDate: '2026-03-01',
          arrivalDate: '2026-04-01',
          products: [line()],
        },
        ACCOUNT,
      );

      expect(importationRepository.save.mock.calls[0][0]).toMatchObject({
        mlUser: { id: ACCOUNT },
      });
    });

    /**
     * El valor esperado se congela acá y nunca se vuelve a calcular, así que si el
     * precio no se copia al guardar, el lote queda valuado en cero para siempre.
     */
    it('congela el precio de lista de cada producto y el valor esperado del lote', async () => {
      itemRepository.find.mockResolvedValue([{ id: 'MLU1', price: '916.96' }]);

      await service.create(
        {
          orderDate: '2026-03-01',
          arrivalDate: '2026-04-01',
          products: [line({ quantity: 10 })],
        },
        ACCOUNT,
      );

      const saved = importationRepository.save.mock.calls[0][0] as {
        products: { expectedUnitPriceUYU: number | null }[];
        expectedNetUYU: number;
      };

      expect(saved.products[0].expectedUnitPriceUYU).toBe(916.96);
      // 10 × (916,96 − 161,96)
      expect(saved.expectedNetUYU).toBe(7550);
    });

    it('deja el lote sin valuar si el producto no tiene precio en el catálogo', async () => {
      itemRepository.find.mockResolvedValue([{ id: 'MLU1' }]);

      await service.create(
        {
          orderDate: '2026-03-01',
          arrivalDate: '2026-04-01',
          products: [line()],
        },
        ACCOUNT,
      );

      const saved = importationRepository.save.mock.calls[0][0] as {
        products: { expectedUnitPriceUYU: number | null }[];
        expectedNetUYU: number;
      };

      expect(saved.products[0].expectedUnitPriceUYU).toBeNull();
      expect(saved.expectedNetUYU).toBe(0);
    });

    it('recalcula la atribución después de cargar el lote', async () => {
      await service.create(
        {
          orderDate: '2026-03-01',
          arrivalDate: '2026-04-01',
          products: [line()],
        },
        ACCOUNT,
      );

      expect(stockAllocation.recalculate).toHaveBeenCalledWith(ACCOUNT);
    });

    it('rechaza una línea que apunta a item y variación a la vez', async () => {
      await expect(
        service.create(
          {
            orderDate: '2026-03-01',
            arrivalDate: '2026-04-01',
            products: [line({ variationId: 'V1' })],
          },
          ACCOUNT,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rechaza una línea sin item ni variación', async () => {
      await expect(
        service.create(
          {
            orderDate: '2026-03-01',
            arrivalDate: '2026-04-01',
            products: [line({ itemId: undefined })],
          },
          ACCOUNT,
        ),
      ).rejects.toThrow(/publicación o a una variación/);
    });

    it('rechaza un producto que no está en el catálogo de la cuenta', async () => {
      itemRepository.find.mockResolvedValue([]);

      await expect(
        service.create(
          {
            orderDate: '2026-03-01',
            arrivalDate: '2026-04-01',
            products: [line({ itemId: 'MLU-DE-OTRO' })],
          },
          ACCOUNT,
        ),
      ).rejects.toThrow(/no están en el catálogo/);
    });
  });

  describe('costs adicionales', () => {
    it('rechaza un tipo de costo que no es del catálogo de la cuenta', async () => {
      costTypeRepository.find.mockResolvedValue([]);

      await expect(
        service.create(
          {
            orderDate: '2026-03-01',
            arrivalDate: '2026-04-01',
            products: [line()],
            additionalCosts: [
              { typeId: 99, kind: AdditionalCostKind.FIXED, amount: 200 },
            ],
          },
          ACCOUNT,
        ),
      ).rejects.toThrow(/no existen en el catálogo/);
    });

    it('rechaza un porcentaje fuera de rango', async () => {
      await expect(
        service.create(
          {
            orderDate: '2026-03-01',
            arrivalDate: '2026-04-01',
            products: [line()],
            additionalCosts: [
              { typeId: 1, kind: AdditionalCostKind.PERCENTAGE, amount: 140 },
            ],
          },
          ACCOUNT,
        ),
      ).rejects.toThrow(/no es un porcentaje válido/);
    });

    it('un costo porcentual no guarda moneda ni tipo de cambio', async () => {
      await service.create(
        {
          orderDate: '2026-03-01',
          arrivalDate: '2026-04-01',
          products: [line()],
          additionalCosts: [
            { typeId: 1, kind: AdditionalCostKind.PERCENTAGE, amount: 60 },
          ],
        },
        ACCOUNT,
      );

      expect(costRepository.create.mock.calls[0][0]).toMatchObject({
        currency: null,
        exchangeToUYURate: null,
      });
    });

    it('un costo fijo sin moneda se toma en pesos', async () => {
      await service.create(
        {
          orderDate: '2026-03-01',
          arrivalDate: '2026-04-01',
          products: [line()],
          additionalCosts: [
            { typeId: 1, kind: AdditionalCostKind.FIXED, amount: 5000 },
          ],
        },
        ACCOUNT,
      );

      expect(costRepository.create.mock.calls[0][0]).toMatchObject({
        currency: 'UYU',
        exchangeToUYURate: 1,
      });
    });
  });

  describe('findOne', () => {
    it('tira 404 si la importación es de otra cuenta', async () => {
      importationRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne(7, ACCOUNT)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('borra y recalcula', async () => {
      importationRepository.findOne.mockResolvedValue({ id: 7 });

      await service.remove(7, ACCOUNT);

      expect(importationRepository.remove).toHaveBeenCalled();
      expect(stockAllocation.recalculate).toHaveBeenCalledWith(ACCOUNT);
    });
  });
});
