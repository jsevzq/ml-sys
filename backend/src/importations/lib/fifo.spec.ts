import { allocateFifo, type ImportationLot, type SaleToAllocate } from './fifo';

const date = (iso: string) => new Date(iso);

const lot = (over: Partial<ImportationLot> = {}): ImportationLot => ({
  id: 1,
  itemId: null,
  variationId: 'V1',
  arrivalDate: date('2026-01-01'),
  quantity: 10,
  importationId: 1,
  ...over,
});

let secuencia = 0;

const sale = (over: Partial<SaleToAllocate> = {}): SaleToAllocate => ({
  orderItemId: 1,
  mlItemId: 'MLU1',
  mlVariationId: 'V1',
  quantity: 1,
  soldAt: date('2026-02-01'),
  order: (over.orderItemId as number | undefined) ?? ++secuencia,
  ...over,
});

describe('atribuirFifo', () => {
  it('consume primero el lote más viejo', () => {
    const { allocations } = allocateFifo(
      [
        lot({ id: 20, arrivalDate: date('2026-03-01'), importationId: 2 }),
        lot({ id: 10, arrivalDate: date('2026-01-01'), importationId: 1 }),
      ],
      [sale({ orderItemId: 1, soldAt: date('2026-04-01') })],
    );

    expect(allocations).toMatchObject([
      {
        orderItemId: 1,
        importationProductId: 10,
        quantity: 1,
        historica: false,
      },
    ]);
  });

  it('parte una venta entre dos lotes cuando el primero no alcanza', () => {
    const { allocations, soldByLot } = allocateFifo(
      [
        lot({
          id: 10,
          quantity: 2,
          arrivalDate: date('2026-01-01'),
          importationId: 1,
        }),
        lot({
          id: 20,
          quantity: 5,
          arrivalDate: date('2026-02-01'),
          importationId: 2,
        }),
      ],
      [sale({ quantity: 3, soldAt: date('2026-03-01') })],
    );

    expect(
      allocations.map((a) => [a.importationProductId, a.quantity]),
    ).toEqual([
      [10, 2],
      [20, 1],
    ]);
    expect(soldByLot.get(10)).toBe(2);
    expect(soldByLot.get(20)).toBe(1);
  });

  it('atribuye las ventas en orden cronológico, no en el orden en que llegaron', () => {
    const { allocations } = allocateFifo(
      [lot({ id: 10, quantity: 1 })],
      [
        sale({ orderItemId: 99, soldAt: date('2026-05-01') }),
        sale({ orderItemId: 11, soldAt: date('2026-02-01') }),
      ],
    );

    // La venta de febrero se lleva la única unidad; la de mayo queda sin lote.
    expect(allocations).toHaveLength(1);
    expect(allocations[0].orderItemId).toBe(11);
  });

  it('no atribuye una venta anterior a la llegada del lote', () => {
    const { allocations, unallocated } = allocateFifo(
      [lot({ id: 10, arrivalDate: date('2026-06-01') })],
      [sale({ orderItemId: 1, soldAt: date('2026-02-01'), quantity: 2 })],
    );

    expect(allocations).toHaveLength(0);
    expect(unallocated).toEqual([{ orderItemId: 1, quantity: 2 }]);
  });

  it('deja sin atribuir lo que excede el stock importado', () => {
    const { allocations, unallocated } = allocateFifo(
      [lot({ id: 10, quantity: 1 })],
      [sale({ quantity: 4 })],
    );

    expect(allocations[0].quantity).toBe(1);
    expect(unallocated).toEqual([{ orderItemId: 1, quantity: 3 }]);
  });

  describe('matcheo estricto', () => {
    it('la venta de una variación no toca el lote de otra variación', () => {
      const { allocations, unallocated } = allocateFifo(
        [lot({ id: 10, variationId: 'V2' })],
        [sale({ mlVariationId: 'V1' })],
      );

      expect(allocations).toHaveLength(0);
      expect(unallocated).toHaveLength(1);
    });

    it('la venta de una variación no consume el lote de la publicación padre', () => {
      const { allocations } = allocateFifo(
        [lot({ id: 10, itemId: 'MLU1', variationId: null })],
        [sale({ mlItemId: 'MLU1', mlVariationId: 'V1' })],
      );

      expect(allocations).toHaveLength(0);
    });

    it('la venta de una publicación sin variantes consume su lote de item', () => {
      const { allocations } = allocateFifo(
        [lot({ id: 10, itemId: 'MLU1', variationId: null })],
        [sale({ mlItemId: 'MLU1', mlVariationId: null })],
      );

      expect(allocations[0].importationProductId).toBe(10);
    });
  });

  it('es idempotente: recalcular no mueve el resultado', () => {
    const lots = [
      lot({
        id: 10,
        quantity: 3,
        arrivalDate: date('2026-01-01'),
        importationId: 1,
      }),
      lot({
        id: 20,
        quantity: 3,
        arrivalDate: date('2026-02-01'),
        importationId: 2,
      }),
    ];
    const sales = [
      sale({ orderItemId: 1, quantity: 2, soldAt: date('2026-03-01') }),
      sale({ orderItemId: 2, quantity: 3, soldAt: date('2026-04-01') }),
    ];

    const first = allocateFifo(lots, sales);
    const segunda = allocateFifo(lots, sales);

    expect(segunda.allocations).toEqual(first.allocations);
    expect([...segunda.soldByLot]).toEqual([...first.soldByLot]);
    // Y el total atribuido nunca supera lo importado, por más veces que se corra.
    expect([...segunda.soldByLot.values()].reduce((a, b) => a + b, 0)).toBe(5);
  });

  describe('ventas anteriores al historial de ML', () => {
    it('consumen los lotes antes que las ventas conocidas', () => {
      const { allocations } = allocateFifo(
        [lot({ id: 10, quantity: 2, arrivalDate: date('2025-01-01') })],
        [
          sale({ orderItemId: 5, soldAt: date('2026-02-01'), order: 2 }),
          {
            orderItemId: null,
            mlItemId: 'MLU1',
            mlVariationId: 'V1',
            quantity: 1,
            soldAt: date('2025-08-05'),
            order: 1,
            historica: true,
          },
        ],
      );

      // La histórica es más vieja: se lleva la primera unidad del lote.
      expect(allocations[0]).toMatchObject({
        orderItemId: null,
        historica: true,
        quantity: 1,
      });
      expect(allocations[1]).toMatchObject({
        orderItemId: 5,
        historica: false,
      });
    });

    it('dejan constancia de qué producto consumieron aunque no haya orden', () => {
      const { allocations } = allocateFifo(
        [lot({ id: 10, quantity: 5 })],
        [
          {
            orderItemId: null,
            mlItemId: 'MLU1',
            mlVariationId: 'V1',
            quantity: 3,
            soldAt: date('2026-02-01'),
            order: 1,
            historica: true,
          },
        ],
      );

      expect(allocations[0]).toMatchObject({
        mlItemId: 'MLU1',
        mlVariationId: 'V1',
        quantity: 3,
      });
    });
  });

  it('sin lotes cargados, todas las ventas quedan sin atribuir', () => {
    const { allocations, unallocated } = allocateFifo(
      [],
      [sale({ quantity: 7 })],
    );

    expect(allocations).toHaveLength(0);
    expect(unallocated).toEqual([{ orderItemId: 1, quantity: 7 }]);
  });
});
