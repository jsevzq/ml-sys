import { calculateCosts, CostKind } from './landed-cost';

const line = (id: number, quantity: number, price: number, rate = 40) => ({
  id,
  quantity,
  price,
  exchangeToUYURate: rate,
});

describe('calcularCostos', () => {
  it('sin costos adicionales, el costo es el precio de compra convertido', () => {
    const { merchandiseUYU, additionalUYU, totalUYU, byLine } = calculateCosts([
      line(1, 10, 5),
    ]);

    expect(merchandiseUYU).toBe(2000);
    expect(additionalUYU).toBe(0);
    expect(totalUYU).toBe(2000);
    expect(byLine.get(1)).toMatchObject({ unitUYU: 200, totalUYU: 2000 });
  });

  it('suma un costo fijo convertido a pesos', () => {
    const { additionalUYU, totalUYU, byLine } = calculateCosts(
      [line(1, 10, 5)],
      [{ id: 1, kind: CostKind.FIJO, amount: 100, exchangeToUYURate: 40 }],
    );

    expect(additionalUYU).toBe(4000);
    expect(totalUYU).toBe(6000);
    // 10 unidades que costaban 200 ahora cuestan 600 puestas en depósito.
    expect(byLine.get(1)?.unitUYU).toBe(600);
  });

  it('un costo porcentual se calcula sobre la mercadería', () => {
    const { additionalUYU, totalUYU } = calculateCosts(
      [line(1, 10, 5)],
      [{ id: 1, kind: CostKind.PERCENTAGE, amount: 60 }],
    );

    expect(additionalUYU).toBe(1200);
    expect(totalUYU).toBe(3200);
  });

  it('el porcentual ignora los costos fijos: el orden de carga no cambia nada', () => {
    const fixedFirst = calculateCosts(
      [line(1, 10, 5)],
      [
        { id: 1, kind: CostKind.FIJO, amount: 100, exchangeToUYURate: 40 },
        { id: 2, kind: CostKind.PERCENTAGE, amount: 60 },
      ],
    );
    const percentageFirst = calculateCosts(
      [line(1, 10, 5)],
      [
        { id: 2, kind: CostKind.PERCENTAGE, amount: 60 },
        { id: 1, kind: CostKind.FIJO, amount: 100, exchangeToUYURate: 40 },
      ],
    );

    // 2000 de mercadería + 4000 de flete + 1200 (60% de 2000) = 7200
    expect(fixedFirst.totalUYU).toBe(7200);
    expect(percentageFirst.totalUYU).toBe(7200);
  });

  it('prorratea los adicionales por valor, no por unidades', () => {
    const { byLine } = calculateCosts(
      [
        line(1, 10, 5), // 2000 -> 2/3 del valor
        line(2, 10, 2.5), // 1000 -> 1/3 del valor
      ],
      [{ id: 1, kind: CostKind.FIJO, amount: 30, exchangeToUYURate: 40 }],
    );

    expect(byLine.get(1)?.additionalUYU).toBe(800);
    expect(byLine.get(2)?.additionalUYU).toBe(400);
    expect(byLine.get(1)!.additionalUYU + byLine.get(2)!.additionalUYU).toBe(
      1200,
    );
  });

  it('el costo fijo sin tipo de cambio se toma como pesos', () => {
    const { additionalUYU } = calculateCosts(
      [line(1, 1, 10)],
      [{ id: 1, kind: CostKind.FIJO, amount: 500, exchangeToUYURate: null }],
    );

    expect(additionalUYU).toBe(500);
  });

  it('tolera decimales de Postgres que llegan como string', () => {
    const { merchandiseUYU, additionalUYU, totalUYU } = calculateCosts(
      [{ id: 1, quantity: 3, price: '4.35', exchangeToUYURate: '40.0000' }],
      [
        {
          id: 1,
          kind: CostKind.FIJO,
          amount: '100.00',
          exchangeToUYURate: '40.0000',
        },
      ],
    );

    expect(merchandiseUYU).toBe(522);
    expect(additionalUYU).toBe(4000);
    expect(totalUYU).toBe(4522);
  });

  it('reparte en partes iguales si la mercadería vale cero', () => {
    const { byLine } = calculateCosts(
      [line(1, 1, 0), line(2, 1, 0)],
      [{ id: 1, kind: CostKind.FIJO, amount: 100, exchangeToUYURate: 1 }],
    );

    expect(byLine.get(1)?.additionalUYU).toBe(50);
    expect(byLine.get(2)?.additionalUYU).toBe(50);
  });
});
