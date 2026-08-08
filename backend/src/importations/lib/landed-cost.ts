/**
 * Costo real de una importación puesta en depósito.
 *
 * El precio de compra no es lo que costó una unidad: hay flete, despachante, seguro
 * y el régimen aduanero. Esos costos adicionales se prorratean **por valor** entre las
 * líneas, porque es el único reparto que se puede calcular con lo que se carga hoy
 * (el peso por línea no se pide).
 *
 * Los costos porcentuales se calculan sobre el costo de la mercadería y nada más, así
 * que el orden en que se cargan no cambia el resultado.
 */

export enum CostKind {
  FIJO = 'fixed',
  PERCENTAGE = 'percentage',
}

export interface CostableLine {
  id: number;
  quantity: number;
  price: number | string;
  exchangeToUYURate: number | string;
  /**
   * Id de la línea de la que salió, cuando a esta la generó una mutación. No se
   * compró: es una unidad de esa otra línea que resultó ser otro producto. Queda
   * afuera del reparto y hereda su costo unitario, para que el invertido del lote
   * no cambie y las demás líneas no se muevan por algo que no las tocó.
   */
  generatedFromId?: number | null;
}

export interface CostableAdditionalCost {
  id: number;
  kind: CostKind | string;
  amount: number | string;
  exchangeToUYURate?: number | string | null;
}

export interface LineCost {
  /** Lo que costó la mercadería de esta línea, sin adicionales. */
  merchandiseUYU: number;
  /** Parte de los costos adicionales que le tocó. */
  additionalUYU: number;
  /** Costo total de la línea, ya con adicionales. */
  totalUYU: number;
  /** Costo de una unidad puesta en depósito. */
  unitUYU: number;
}

export interface ImportationCost {
  merchandiseUYU: number;
  additionalUYU: number;
  totalUYU: number;
  byLine: Map<number, LineCost>;
  /** Cuánto quedó cada costo adicional, ya convertido a pesos. */
  byCost: Map<number, number>;
}

const toNumber = (value: number | string | null | undefined): number => {
  if (value === null || value === undefined) return 0;
  const convertido = Number(value);
  return Number.isFinite(convertido) ? convertido : 0;
};

const round = (value: number): number => Math.round(value * 100) / 100;

/** Un costo fijo se convierte a pesos; uno porcentual se aplica sobre la mercadería. */
export function amountInPesos(
  cost: CostableAdditionalCost,
  merchandiseUYU: number,
): number {
  if (String(cost.kind) === String(CostKind.PERCENTAGE)) {
    return round((merchandiseUYU * toNumber(cost.amount)) / 100);
  }
  return round(toNumber(cost.amount) * (toNumber(cost.exchangeToUYURate) || 1));
}

export function calculateCosts(
  lines: CostableLine[],
  costs: CostableAdditionalCost[] = [],
): ImportationCost {
  const purchasedLines = lines.filter((line) => !line.generatedFromId);
  const generadas = lines.filter((line) => line.generatedFromId);

  const lineValue = new Map<number, number>();
  let merchandiseUYU = 0;

  for (const line of purchasedLines) {
    const value =
      toNumber(line.price) * line.quantity * toNumber(line.exchangeToUYURate);
    lineValue.set(line.id, value);
    merchandiseUYU += value;
  }

  const byCost = new Map<number, number>();
  let additionalUYU = 0;

  for (const cost of costs) {
    const amount = amountInPesos(cost, merchandiseUYU);
    byCost.set(cost.id, amount);
    additionalUYU += amount;
  }

  const byLine = new Map<number, LineCost>();

  for (const line of purchasedLines) {
    const value = lineValue.get(line.id) ?? 0;
    // Sin mercadería no hay proporción posible: se reparte en partes iguales.
    const participacion =
      merchandiseUYU > 0
        ? value / merchandiseUYU
        : 1 / (purchasedLines.length || 1);
    const adicional = additionalUYU * participacion;
    const total = value + adicional;

    byLine.set(line.id, {
      merchandiseUYU: round(value),
      additionalUYU: round(adicional),
      totalUYU: round(total),
      unitUYU: line.quantity > 0 ? round(total / line.quantity) : 0,
    });
  }

  for (const line of generadas) {
    const source = byLine.get(line.generatedFromId!);
    const unitario = source?.unitUYU ?? 0;
    const total = round(unitario * line.quantity);
    const merchandise = round(
      toNumber(line.price) * line.quantity * toNumber(line.exchangeToUYURate),
    );

    byLine.set(line.id, {
      merchandiseUYU: merchandise,
      additionalUYU: round(total - merchandise),
      totalUYU: total,
      unitUYU: unitario,
    });
  }

  return {
    merchandiseUYU: round(merchandiseUYU),
    additionalUYU: round(additionalUYU),
    totalUYU: round(merchandiseUYU + additionalUYU),
    byLine,
    byCost,
  };
}
