import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { MlService } from './ml.service';
import { MlUser } from './entities/ml-user.entity';
import { MlClientService } from '../ml-client/ml-client.service';
import { ItemsService } from '../items/items.service';

/**
 * `/items/search` devuelve como máximo una página y **no avisa** cuando hay más:
 * sin paginar, el catálogo dejaba de sincronizarse en silencio al pasar de 50
 * publicaciones. Estos tests fijan que se recorra el scroll entero y que el
 * bucle corte de verdad.
 */
describe('MlService.fetchSellerItems', () => {
  const repository = {
    findOneBy: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
  };
  const mlClientService = {
    get: jest.fn(),
    exchangeCode: jest.fn(),
    refreshToken: jest.fn(),
  };
  let service: MlService;

  const pageOf = (quantity: number, from: number) =>
    Array.from({ length: quantity }, (_, i) => `MLU${from + i}`);

  beforeEach(async () => {
    jest.resetAllMocks();
    repository.findOneBy.mockResolvedValue({
      id: 'uuid',
      userId: '2',
      mlUserId: '999',
      accessToken: 'token',
      expiresAt: new Date(Date.now() + 3600_000),
    });

    const moduleRef = await Test.createTestingModule({
      providers: [
        MlService,
        { provide: getRepositoryToken(MlUser), useValue: repository },
        { provide: MlClientService, useValue: mlClientService },
        { provide: ItemsService, useValue: { upsertMany: jest.fn() } },
        {
          provide: CACHE_MANAGER,
          useValue: { get: jest.fn(), set: jest.fn(), del: jest.fn() },
        },
      ],
    }).compile();

    service = moduleRef.get(MlService);
  });

  it('junta todas las páginas siguiendo el scroll_id', async () => {
    mlClientService.get
      .mockResolvedValueOnce({ results: pageOf(100, 0), scroll_id: 'a' })
      .mockResolvedValueOnce({ results: pageOf(100, 100), scroll_id: 'b' })
      .mockResolvedValueOnce({ results: pageOf(20, 200), scroll_id: 'c' });

    const ids = await service.fetchSellerItems('2');

    expect(ids).toHaveLength(220);
    expect(ids[0]).toBe('MLU0');
    expect(ids.at(-1)).toBe('MLU219');
    expect(mlClientService.get).toHaveBeenCalledTimes(3);
  });

  it('pide en modo scan y arrastra el cursor', async () => {
    mlClientService.get
      .mockResolvedValueOnce({
        results: pageOf(100, 0),
        scroll_id: 'cursor-1',
      })
      .mockResolvedValueOnce({ results: [], scroll_id: 'cursor-1' });

    await service.fetchSellerItems('2');

    const rutas = mlClientService.get.mock.calls.map(
      (llamada) => (llamada as unknown as string[])[0],
    );
    expect(rutas[0]).toContain('search_type=scan');
    expect(rutas[0]).not.toContain('scroll_id');
    expect(rutas[1]).toContain('scroll_id=cursor-1');
  });

  // ML repite el último scroll_id cuando ya no queda nada: sin cortar por página
  // vacía, el bucle pediría lo mismo hasta el tope de seguridad.
  it('corta cuando una página vuelve vacía', async () => {
    mlClientService.get
      .mockResolvedValueOnce({ results: pageOf(100, 0), scroll_id: 'a' })
      .mockResolvedValue({ results: [], scroll_id: 'a' });

    const ids = await service.fetchSellerItems('2');

    expect(ids).toHaveLength(100);
    expect(mlClientService.get).toHaveBeenCalledTimes(2);
  });

  it('no repite ids si ML los devuelve dos veces', async () => {
    mlClientService.get
      .mockResolvedValueOnce({ results: pageOf(100, 0), scroll_id: 'a' })
      .mockResolvedValueOnce({ results: pageOf(100, 50), scroll_id: 'b' })
      .mockResolvedValueOnce({ results: [], scroll_id: 'b' });

    const ids = await service.fetchSellerItems('2');

    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toHaveLength(150);
  });

  it('una sola página corta sin pedir más', async () => {
    mlClientService.get.mockResolvedValueOnce({
      results: pageOf(21, 0),
      scroll_id: 'a',
    });

    const ids = await service.fetchSellerItems('2');

    expect(ids).toHaveLength(21);
    expect(mlClientService.get).toHaveBeenCalledTimes(1);
  });
});
