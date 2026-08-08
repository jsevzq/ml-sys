/**
 * Cuánto se espera generar con una importación una vez que se venda entera.
 *
 * El costo de una importación se sabe el día que llega; lo que va a dejar, no. Este
 * módulo pone un número a esa expectativa: recorre las líneas, toma el precio de
 * lista de cada producto y descuenta lo que Mercado Libre se queda.
 *
 * Es una **foto del día que se persiste la importación**, no un indicador vivo. Si
 * mañana sube el precio de lista, el valor esperado de un lote que ya llegó no
 * cambia: era lo que se esperaba entonces, y es contra eso que después se compara
 * lo que realmente pasó.
 *
 * ## De dónde salen las constantes
 *
 * No están elegidas a ojo: salen de ajustar el histórico de ventas contra lo que
 * Mercado Libre efectivamente liquidó.
 * La comisión de Mercado Libre resultó ser exactamente
 *
 *     comisión por unidad = precio × 14,5 % + costo fijo
 *
 * con un costo fijo que depende del precio y de la época. Sobre los pares
 * (precio, comisión) distintos del histórico, la fórmula reproduce el importe al
 * centavo en todos.
 *
 * El envío es el otro término, y ahí el hallazgo fue que **se cancela solo**. Las
 * ventas por agencia le cuestan al vendedor unos $14 por unidad, pero una de cada
 * diez sale por Flex y ahí Mercado Libre acredita ~$135. Mezclado da +$0,80 por
 * unidad sobre ventas de ~$900: ruido. Modelarlo como cero es más honesto que
 * arrastrar un parámetro de mezcla que se desactualiza solo.
 *
 * Con esas dos piezas, el modelo predice el neto real de las últimas 173 unidades
 * con un desvío de −0,14 %.
 */

/** Comisión de Mercado Libre sobre el precio de venta. */
export const COMMISSION_RATE = 0.145;

/**
 * Cargo fijo por unidad, y desde cuándo rige cada importe. Ordenado del más nuevo
 * al más viejo, que es como se recorre.
 *
 * El salto de $15 a $29 está fechado con precisión en el histórico: la última venta
 * que pagó $15 fue el 30 de junio de 2025 y la primera que pagó $29, el 3 de julio.
 * Sin esto los lotes de 2024 y del primer semestre de 2025 quedan subvaluados ~4 %,
 * porque se les cobraría un cargo que en su momento no existía.
 */
export const FIXED_FEE_TIERS = [
  { from: new Date('2025-07-01T00:00:00.000Z'), amount: 29 },
  { from: new Date(0), amount: 15 },
] as const;

/**
 * Precio a partir del cual no hay costo fijo. El histórico lo acota entre $1.016,37
 * (la venta más cara que sí lo pagó) y $1.116,96 (la más barata que no): $1.100 es
 * el escalón publicado por Mercado Libre y cae justo en esa ventana.
 */
export const PRICE_ABOVE_FIXED_FEE = 1100;

/**
 * Lo que el envío suma o resta por unidad, en promedio. Ver el encabezado: las
 * ventas por agencia y las de Flex se compensan entre sí.
 */
export const EXPECTED_SHIPPING_BALANCE = 0;

export interface ExpectableLine {
  quantity: number;
  /** Precio de lista del producto en Mercado Libre. Null si no se conoce. */
  expectedUnitPriceUYU: number | string | null;
}

/**
 * Fecha con la que se elige el esquema de comisiones. Se usa la llegada del lote:
 * es la que dice bajo qué reglas iba a venderse, y a diferencia de "hoy" no cambia,
 * así que el número guardado y el que se recalcula para mostrar siempre coinciden.
 */
export type ScheduleDate = Date;

export interface ExpectedValue {
  /** Lo que Mercado Libre va a depositar por todo el lote. */
  netUYU: number;
  /** Unidades que se pudieron valuar. */
  valuedUnits: number;
  /** Unidades sin precio de lista conocido: no suman al neto. */
  unitsWithoutPrice: number;
}

const toNumber = (value: number | string | null | undefined): number => {
  if (value === null || value === undefined) return 0;
  const convertido = Number(value);
  return Number.isFinite(convertido) ? convertido : 0;
};

const round = (value: number): number => Math.round(value * 100) / 100;

/**
 * Redondeo a la mitad al par, que es como Mercado Libre redondea la comisión:
 * $144,775 termina en $144,78 y $146,225 en $146,22. Con el redondeo común hacia
 * arriba, 6 de los 19 importes del histórico salen un centavo desviados.
 *
 * La tolerancia no es decorativa: 895 × 0,145 + 15 da 144,77499999999998 en punto
 * flotante, y sin ella ese caso se iría para el lado equivocado.
 */
function roundHalfToEven(value: number): number {
  const escalado = value * 100;
  const piso = Math.floor(escalado);
  const resto = escalado - piso;

  if (Math.abs(resto - 0.5) > 1e-9) return Math.round(escalado) / 100;
  return (piso % 2 === 0 ? piso : piso + 1) / 100;
}

/** El cargo fijo sólo lo pagan los productos por debajo del escalón. */
export function fixedFeeFor(price: number, date: ScheduleDate): number {
  if (price >= PRICE_ABOVE_FIXED_FEE) return 0;

  const tier = FIXED_FEE_TIERS.find((candidate) => date >= candidate.from);
  return tier?.amount ?? 0;
}

/** Lo que Mercado Libre cobra por vender una unidad a ese precio. */
export function expectedCommission(price: number, date: ScheduleDate): number {
  if (price <= 0) return 0;
  return roundHalfToEven(price * COMMISSION_RATE + fixedFeeFor(price, date));
}

/** Lo que queda de una unidad vendida a ese precio, después de Mercado Libre. */
export function expectedUnitNet(price: number, date: ScheduleDate): number {
  if (price <= 0) return 0;
  return round(
    price - expectedCommission(price, date) + EXPECTED_SHIPPING_BALANCE,
  );
}

/**
 * Suma el neto esperado de todas las líneas.
 *
 * Una línea sin precio de lista —el producto se despublicó, o nunca se sincronizó—
 * no se inventa: aporta cero y se cuenta aparte, para que quien lea el número sepa
 * que se quedó corto y por cuánto.
 */
export function calculateExpectedValue(
  lines: ExpectableLine[],
  date: ScheduleDate,
): ExpectedValue {
  let netUYU = 0;
  let valuedUnits = 0;
  let unitsWithoutPrice = 0;

  for (const line of lines) {
    const price = toNumber(line.expectedUnitPriceUYU);

    if (price <= 0) {
      unitsWithoutPrice += line.quantity;
      continue;
    }

    netUYU += expectedUnitNet(price, date) * line.quantity;
    valuedUnits += line.quantity;
  }

  return { netUYU: round(netUYU), valuedUnits, unitsWithoutPrice };
}
