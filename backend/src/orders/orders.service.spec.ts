import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Logger, NotFoundException } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { Order } from './entities/order.entity';
import { OrderItemType } from './entities/order-item.entity';
import { Shipment } from './entities/shipment.entity';
import { Item } from '../items/entities/item.entity';
import { Variation } from '../items/entities/variation.entity';
import { MlUser } from '../ml/entities/ml-user.entity';
import { MlClientService } from '../ml-client/ml-client.service';
import { StockAllocationService } from '../importations/stock-allocation.service';
import { MlRawOrder } from './interfaces/ml-order.interface';

const ACCOUNT = 'cuenta-uuid-1';

const account = (overrides: Partial<MlUser> = {}): MlUser =>
  ({
    id: ACCOUNT,
    mlUserId: '123456789',
    accessToken: 'token',
    ordersSyncedUntil: null,
    ...overrides,
  }) as MlUser;

const rawOrder = (overrides: Partial<MlRawOrder> = {}): MlRawOrder => ({
  id: 2000012345678901,
  status: 'paid',
  date_created: '2026-03-07T13:15:38.000-04:00',
  date_closed: '2026-03-07T13:15:40.000-04:00',
  date_last_updated: '2026-03-10T10:04:33.000-04:00',
  total_amount: 916.96,
  paid_amount: 916.96,
  currency_id: 'UYU',
  shipping_cost: null,
  coupon: { amount: 0 },
  pack_id: 2000012345678902,
  buyer: { nickname: 'COMPRADOR1' },
  shipping: { id: 11111111111 },
  order_items: [
    {
      item: {
        id: 'MLU1234567891',
        title: 'Cable USB-C 1 Metro',
        variation_id: 111111111112,
      },
      quantity: 1,
      unit_price: 916.96,
      sale_fee: 161.96,
      currency_id: 'UYU',
      base_exchange_rate: null,
      base_currency_id: null,
    },
  ],
  ...overrides,
});

describe('OrdersService', () => {
  let service: OrdersService;

  const transaction = jest.fn();
  const orderRepository = {
    findAndCount: jest.fn<Promise<[Order[], number]>, [object]>(),
    findOne: jest.fn<Promise<Order | null>, [object]>(),
    find: jest.fn<Promise<Order[]>, [object]>(),
    manager: { transaction },
  };
  const shipmentRepository = {
    save: jest.fn(),
    findOneBy: jest.fn().mockResolvedValue(null),
  };
  const itemRepository = { find: jest.fn<Promise<Item[]>, [object]>() };
  const variationRepository = {
    find: jest.fn<Promise<Variation[]>, [object]>(),
  };
  const mlUserRepository = {
    update: jest.fn<Promise<unknown>, [string, Partial<MlUser>]>(),
  };
  const mlClientService = {
    get: jest.fn<Promise<unknown>, [string, string]>(),
  };
  const stockAllocation = { recalculate: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);

    itemRepository.find.mockResolvedValue([]);
    variationRepository.find.mockResolvedValue([]);
    shipmentRepository.save.mockImplementation((s: Shipment) =>
      Promise.resolve(s),
    );
    transaction.mockImplementation(
      async (cb: (m: unknown) => Promise<void>) =>
        await cb({ delete: jest.fn(), save: jest.fn() }),
    );
    stockAllocation.recalculate.mockResolvedValue({
      allocations: 0,
      allocatedUnits: 0,
      unitsWithoutLot: 0,
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: getRepositoryToken(Order), useValue: orderRepository },
        { provide: getRepositoryToken(Shipment), useValue: shipmentRepository },
        { provide: getRepositoryToken(Item), useValue: itemRepository },
        {
          provide: getRepositoryToken(Variation),
          useValue: variationRepository,
        },
        { provide: getRepositoryToken(MlUser), useValue: mlUserRepository },
        { provide: MlClientService, useValue: mlClientService },
        { provide: StockAllocationService, useValue: stockAllocation },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('filtra siempre por la cuenta dueña y pagina', async () => {
      orderRepository.findAndCount.mockResolvedValue([[], 0]);

      const result = await service.findAll(ACCOUNT, {
        limit: 10,
        offset: 20,
      });

      expect(orderRepository.findAndCount.mock.calls[0][0]).toMatchObject({
        where: { mlUser: { id: ACCOUNT } },
        take: 10,
        skip: 20,
      });
      expect(result).toMatchObject({ total: 0, limit: 10, offset: 20 });
    });
  });

  describe('summary', () => {
    /** Una venta pagada de un producto, con su comisión ya descontada. */
    const sale = (
      mlItemId: string,
      title: string,
      quantity: number,
      price: number,
      fee: number,
    ) =>
      ({
        id: `o-${mlItemId}-${quantity}`,
        status: 'paid',
        dateCreated: new Date('2026-03-01T12:00:00Z'),
        dateClosed: new Date('2026-03-01T12:00:00Z'),
        totalAmount: price * quantity,
        shipment: null,
        items: [
          {
            mlItemId,
            mlVariationId: null,
            title: title,
            quantity: quantity,
            unitPrice: price,
            saleFee: fee,
            item: null,
          },
        ],
      }) as unknown as Order;

    /**
     * El Resumen dibuja el neto: ordenar por unidades dejaba las barras sin
     * escalera. Y el corte tiene que usar el mismo criterio, porque un producto
     * que vende poco pero deja mucho quedaría afuera sin forma de recuperarlo.
     */
    it('ordena los productos por neto, no por unidades', async () => {
      orderRepository.find.mockResolvedValue([
        // Muchas unidades baratas: gana en cantidad, pierde en plata.
        sale('BARATO', 'Barato', 40, 100, 20),
        // Pocas unidades caras: tiene que ir primero.
        sale('CARO', 'Caro', 5, 2000, 300),
      ]);

      const summary = await service.summary(ACCOUNT, {});

      expect(summary.topProducts.map((p) => p.mlItemId)).toEqual([
        'CARO',
        'BARATO',
      ]);
      expect(summary.topProducts[0].units).toBeLessThan(
        summary.topProducts[1].units,
      );
    });

    it('desempata por unidades cuando el neto es igual', async () => {
      orderRepository.find.mockResolvedValue([
        sale('POCAS', 'Pocas', 2, 500, 100),
        sale('MUCHAS', 'Muchas', 4, 250, 50),
      ]);

      const summary = await service.summary(ACCOUNT, {});

      expect(summary.topProducts.map((p) => p.net)).toEqual([800, 800]);
      expect(summary.topProducts[0].mlItemId).toBe('MUCHAS');
    });

    /**
     * El corte a diez tiene que usar el mismo criterio que el orden. Es la razón
     * de que esto se arregle acá y no en el cliente: si el recorte se hace por
     * unidades, el producto que deja más plata ya no viaja y no hay forma de
     * recuperarlo reordenando del otro lado.
     */
    it('recorta a los diez de mayor neto, no a los de más unidades', async () => {
      const sales = Array.from({ length: 14 }, (_, i) => {
        // El neto total baja con el índice y las unidades suben: los dos
        // criterios eligen conjuntos opuestos.
        const units = i + 1;
        const totalNet = 10000 - i * 500;
        return sale(`P${i}`, `Producto ${i}`, units, totalNet / units, 0);
      });
      orderRepository.find.mockResolvedValue(sales);

      const summary = await service.summary(ACCOUNT, {});
      const elegidos = summary.topProducts.map((p) => p.mlItemId);

      expect(elegidos).toHaveLength(10);
      expect(elegidos[0]).toBe('P0');
      // P10 a P13 son los de más unidades y los de menos neto: quedan afuera.
      expect(elegidos).not.toContain('P13');
      expect(elegidos).toContain('P9');
    });
  });

  describe('findOne', () => {
    it('tira 404 si la venta no es de esta cuenta', async () => {
      orderRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('123', ACCOUNT)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('sync', () => {
    const searchResponse = (results: MlRawOrder[], total = results.length) => ({
      results,
      paging: { total, offset: 0, limit: 50 },
    });

    it('hace backfill completo cuando no hay cursor', async () => {
      mlClientService.get.mockImplementation((url: string) => {
        if (url.startsWith('/orders/search'))
          return Promise.resolve(searchResponse([rawOrder()]));
        if (url.endsWith('/costs'))
          return Promise.resolve({
            gross_amount: 239.04,
            receiver: { cost: 71 },
            senders: [{ cost: 0 }],
          });
        return Promise.resolve({
          id: 11111111111,
          logistic: { type: 'xd_drop_off' },
        });
      });

      const result = await service.sync(account());

      const searchUrl = mlClientService.get.mock.calls[0][0];
      expect(searchUrl).not.toContain('date_last_updated');
      expect(result).toMatchObject({
        found: 1,
        saved: 1,
        shipments: 1,
        notSaved: [],
      });
    });

    it('arranca desde el cursor en las corridas siguientes', async () => {
      mlClientService.get.mockResolvedValue(searchResponse([]));
      const from = new Date('2026-07-01T00:00:00.000Z');

      await service.sync(account({ ordersSyncedUntil: from }));

      expect(mlClientService.get.mock.calls[0][0]).toContain(
        `order.date_last_updated.from=${from.toISOString()}`,
      );
    });

    it('guarda el envío una sola vez aunque el pack tenga varias órdenes', async () => {
      const hermanas = [rawOrder({ id: 1 }), rawOrder({ id: 2 })];
      mlClientService.get.mockImplementation((url: string) => {
        if (url.startsWith('/orders/search'))
          return Promise.resolve(searchResponse(hermanas));
        if (url.endsWith('/costs'))
          return Promise.resolve({
            gross_amount: 239.04,
            senders: [{ cost: 0 }],
          });
        return Promise.resolve({
          id: 11111111111,
          logistic: { type: 'xd_drop_off' },
        });
      });

      const result = await service.sync(account());

      expect(result.saved).toBe(2);
      expect(result.shipments).toBe(1);
      expect(shipmentRepository.save).toHaveBeenCalledTimes(1);
    });

    it('deja el cursor en la última actualización que trajo ML', async () => {
      mlClientService.get.mockImplementation((url: string) =>
        url.startsWith('/orders/search')
          ? Promise.resolve(
              searchResponse([
                rawOrder({
                  id: 1,
                  date_last_updated: '2026-03-01T00:00:00.000Z',
                  shipping: null,
                }),
                rawOrder({
                  id: 2,
                  date_last_updated: '2026-07-15T00:00:00.000Z',
                  shipping: null,
                }),
              ]),
            )
          : Promise.resolve({}),
      );

      await service.sync(account());

      expect(mlUserRepository.update.mock.calls[0][1]).toEqual({
        ordersSyncedUntil: new Date('2026-07-15T00:00:00.000Z'),
      });
    });

    it('no frena la sincronización si falla el envío', async () => {
      mlClientService.get.mockImplementation((url: string) => {
        if (url.startsWith('/orders/search'))
          return Promise.resolve(searchResponse([rawOrder()]));
        return Promise.reject(new Error('ML devolvió 404'));
      });

      const result = await service.sync(account());

      expect(result).toMatchObject({ saved: 1, shipments: 0, notSaved: [] });
    });

    it('vincula con el catálogo sólo lo que existe', async () => {
      itemRepository.find.mockResolvedValue([{ id: 'MLU1234567891' } as Item]);
      variationRepository.find.mockResolvedValue([]);

      let saved: Order | undefined;
      transaction.mockImplementation(
        async (
          cb: (m: { delete: jest.Mock; save: jest.Mock }) => Promise<void>,
        ) =>
          await cb({
            delete: jest.fn(),
            save: jest.fn((_: unknown, order: Order) => {
              saved = order;
              return Promise.resolve(order);
            }),
          }),
      );
      mlClientService.get.mockImplementation((url: string) =>
        url.startsWith('/orders/search')
          ? Promise.resolve(searchResponse([rawOrder({ shipping: null })]))
          : Promise.resolve({}),
      );

      await service.sync(account());

      const line = saved!.items[0];
      expect(line.type).toBe(OrderItemType.VARIATION);
      expect(line.item).toEqual({ id: 'MLU1234567891' });
      expect(line.variation).toBeNull();
      expect(line.title).toBe('Cable USB-C 1 Metro');
    });

    it('registra la venta que no se pudo guardar sin cortar el resto', async () => {
      transaction
        .mockImplementationOnce(() =>
          Promise.reject(new Error('violación de FK')),
        )
        .mockImplementation(
          async (cb: (m: unknown) => Promise<void>) =>
            await cb({ delete: jest.fn(), save: jest.fn() }),
        );
      mlClientService.get.mockImplementation((url: string) =>
        url.startsWith('/orders/search')
          ? Promise.resolve(
              searchResponse([
                rawOrder({ id: 1, shipping: null }),
                rawOrder({ id: 2, shipping: null }),
              ]),
            )
          : Promise.resolve({}),
      );

      const result = await service.sync(account());

      expect(result).toMatchObject({ found: 2, saved: 1, notSaved: ['1'] });
    });
  });
});
