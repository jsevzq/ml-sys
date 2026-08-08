import {
  calculateExpectedValue,
  expectedCommission,
  fixedFeeFor,
  expectedUnitNet,
} from './expected-value';

const TODAY = new Date('2026-08-08T00:00:00.000Z');
const BEFORE_THE_TIER_CHANGE = new Date('2025-06-15T00:00:00.000Z');

describe('valor esperado', () => {
  describe('comisión', () => {
    /**
     * Los casos corresponden al esquema de comisiones vigente de Mercado Libre.
     * Si el modelo deja de reproducirlos, dejó de describir cómo cobra.
     */
    it.each([
      ['la tanza de siempre', 916.96, 161.96],
      ['una variante más cara', 1016.37, 176.37],
      ['por encima del escalón, sin cargo fijo', 1200.23, 174.03],
      ['bien por encima del escalón', 1500, 217.5],
    ])('reproduce %s', (_caso, price, expected) => {
      expect(expectedCommission(price, TODAY)).toBe(expected);
    });

    it('cobraba $15 antes de julio de 2025', () => {
      // La misma venta de $905 pagó $146,22 en febrero de 2025 y $160,22 en julio.
      expect(expectedCommission(905, BEFORE_THE_TIER_CHANGE)).toBe(146.22);
      expect(expectedCommission(905, TODAY)).toBe(160.22);
    });

    it('no cobra cargo fijo desde el escalón de $1.100', () => {
      expect(fixedFeeFor(1099.99, TODAY)).toBe(29);
      expect(fixedFeeFor(1100, TODAY)).toBe(0);
    });

    it('no cobra nada por un precio inexistente', () => {
      expect(expectedCommission(0, TODAY)).toBe(0);
      expect(expectedUnitNet(0, TODAY)).toBe(0);
    });
  });

  describe('neto del lote', () => {
    it('suma el neto de cada línea por su cantidad', () => {
      const result = calculateExpectedValue(
        [
          { quantity: 10, expectedUnitPriceUYU: 916.96 },
          { quantity: 2, expectedUnitPriceUYU: 1200.23 },
        ],
        TODAY,
      );

      // 10 × (916,96 − 161,96) + 2 × (1200,23 − 174,03)
      expect(result.netUYU).toBe(9602.4);
      expect(result.valuedUnits).toBe(12);
      expect(result.unitsWithoutPrice).toBe(0);
    });

    it('acepta los decimales que devuelve la base como texto', () => {
      const result = calculateExpectedValue(
        [{ quantity: 1, expectedUnitPriceUYU: '916.96' }],
        TODAY,
      );

      expect(result.netUYU).toBe(755);
    });

    /**
     * Un producto despublicado deja la línea sin precio. Inventarle uno inflaría el
     * valor esperado en silencio; contarla aparte deja ver que el número quedó corto.
     */
    it('no inventa un precio cuando no lo hay, y avisa cuántas unidades quedaron fuera', () => {
      const result = calculateExpectedValue(
        [
          { quantity: 3, expectedUnitPriceUYU: 916.96 },
          { quantity: 5, expectedUnitPriceUYU: null },
        ],
        TODAY,
      );

      expect(result.netUYU).toBe(2265);
      expect(result.valuedUnits).toBe(3);
      expect(result.unitsWithoutPrice).toBe(5);
    });

    it('un lote vacío no vale nada', () => {
      expect(calculateExpectedValue([], TODAY)).toEqual({
        netUYU: 0,
        valuedUnits: 0,
        unitsWithoutPrice: 0,
      });
    });
  });

  /**
   * La prueba que importa: contra el lote 6, que se vendió entero. Mercado Libre
   * depositó $22.716 por sus 30 unidades y el modelo, con los precios de 2024 y el
   * cargo fijo de entonces, esperaba $22.733.
   */
  it('le acierta a un lote real vendido por completo', () => {
    const soldOutLot = [
      { quantity: 2, expectedUnitPriceUYU: 895 },
      { quantity: 2, expectedUnitPriceUYU: 905 },
      { quantity: 2, expectedUnitPriceUYU: 910 },
      { quantity: 2, expectedUnitPriceUYU: 920 },
      { quantity: 2, expectedUnitPriceUYU: 925 },
      { quantity: 20, expectedUnitPriceUYU: 905 },
    ];

    const { netUYU } = calculateExpectedValue(
      soldOutLot,
      new Date('2024-11-20T00:00:00.000Z'),
    );

    const actuallyCollected = 22715.6;
    const desvio = Math.abs(netUYU - actuallyCollected) / actuallyCollected;
    expect(desvio).toBeLessThan(0.02);
  });
});
