import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { ItemsService } from './items.service';
import { Item } from './entities/item.entity';

const baseItem = {
  id: 'MLU1234567890',
  title: 'Pendrive USB 3.2 Metálico',
  categoryId: 'MLU12345',
  price: 916.96,
  currencyId: 'UYU',
  initialQuantity: 78,
  availableQuantity: 6,
  soldQuantity: 72,
  status: 'active',
  health: 0.88,
  logisticType: 'xd_drop_off',
  permalink: 'https://articulo.mercadolibre.com.uy/MLU1234567890',
  thumbnail: 'https://http2.mlstatic.com/D_803910.jpg',
  dateCreated: new Date('2025-08-01'),
  lastUpdated: new Date('2025-08-02'),
  startTime: new Date('2025-08-01'),
  stopTime: new Date('2045-08-01'),
  expirationTime: new Date('2045-08-01'),
  pictures: [],
  attributes: [],
  attributeOptions: [],
  variations: [],
} as unknown as Item;

const ACCOUNT = 'cuenta-uuid-1';

describe('ItemsService', () => {
  let service: ItemsService;
  const repository = {
    find: jest.fn<Promise<Item[]>, [object]>(),
    findOne: jest.fn<Promise<Item | null>, [object]>(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ItemsService,
        { provide: getRepositoryToken(Item), useValue: repository },
      ],
    }).compile();

    service = module.get<ItemsService>(ItemsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('no expone métodos de escritura fuera de la sincronización', () => {
    const escritura = ['create', 'update', 'remove'] as const;
    for (const metodo of escritura) {
      expect(metodo in service).toBe(false);
    }
    expect(typeof service.upsertMany).toBe('function');
  });

  describe('findAll', () => {
    it('devuelve los items como ItemDto', async () => {
      repository.find.mockResolvedValue([baseItem]);

      const result = await service.findAll(ACCOUNT);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('MLU1234567890');
      expect(result[0].price).toBe(916.96);
    });

    it('filtra siempre por la cuenta de ML dueña', async () => {
      repository.find.mockResolvedValue([]);

      await service.findAll(ACCOUNT);

      expect(repository.find.mock.calls[0][0]).toMatchObject({
        where: { mlUser: { id: ACCOUNT } },
      });
    });

    it('convierte a número el decimal que Postgres devuelve como string', async () => {
      repository.find.mockResolvedValue([
        {
          ...baseItem,
          price: '916.96',
          variations: [{ ...baseItem, id: '1', price: '1116.96' }],
        } as unknown as Item,
      ]);

      const [item] = await service.findAll(ACCOUNT);

      expect(item.price).toBe(916.96);
      expect(item.variations[0].price).toBe(1116.96);
    });
  });

  describe('findOne', () => {
    it('devuelve la publicación con sus relaciones', async () => {
      repository.findOne.mockResolvedValue(baseItem);

      const result = await service.findOne('MLU1234567890', ACCOUNT);

      expect(result.title).toBe('Pendrive USB 3.2 Metálico');
      expect(repository.findOne.mock.calls[0][0]).toMatchObject({
        where: { id: 'MLU1234567890', mlUser: { id: ACCOUNT } },
      });
    });

    it('no deja ver la publicación de otra cuenta', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(
        service.findOne('MLU1234567890', 'otra-cuenta'),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(repository.findOne.mock.calls[0][0]).toMatchObject({
        where: { mlUser: { id: 'otra-cuenta' } },
      });
    });

    it('completa attributeId y attributeName de las opciones desde la relación', async () => {
      repository.findOne.mockResolvedValue({
        ...baseItem,
        variations: [
          {
            id: '111111111111',
            price: 916.96,
            availableQuantity: 1,
            soldQuantity: 46,
            pictures: [],
            attributeOptions: [
              {
                id: 1,
                valueName: 'Verde',
                attribute: { id: 'COLOR', name: 'Color' },
              },
            ],
          },
        ],
      } as unknown as Item);

      const result = await service.findOne('MLU1234567890', ACCOUNT);
      const opcion = result.variations[0].attributeOptions[0];

      expect(opcion.attributeId).toBe('COLOR');
      expect(opcion.attributeName).toBe('Color');
      expect(opcion.valueName).toBe('Verde');
    });

    it('tira 404 con el id en el mensaje si no está sincronizada', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.findOne('MLU000', ACCOUNT)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      await expect(service.findOne('MLU000', ACCOUNT)).rejects.toThrow(
        'MLU000',
      );
    });
  });
});
