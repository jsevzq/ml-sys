export function formatPrice(price: number, currency: string) {
  return `${currency} ${price.toLocaleString('es-UY', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * El importe sin la moneda y sin centavos, para los números grandes de un KPI.
 *
 * `UYU 223.939,54` a tamaño de titular no entra en una tarjeta de KPI y partía en
 * dos líneas, dejando la fila con las bases desalineadas. La moneda se muestra
 * aparte y en chico: se repite en las cuatro tarjetas, así que no hace falta que
 * compita con el número.
 */
export function formatAmount(amount: number) {
  return Math.round(amount).toLocaleString('es-UY');
}

export function formatDate(date: string | Date) {
  return new Date(date).toLocaleDateString('es-UY', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/**
 * Fechas de calendario (llegada de una importación, fecha de compra). Se formatean
 * en UTC a propósito: se guardan como medianoche UTC y renderizarlas en la zona
 * local las corría un día para atrás.
 */
export function formatCalendarDate(date: string | Date) {
  return new Date(date).toLocaleDateString('es-UY', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/**
 * Cantidad con su sustantivo en singular o plural: "1 venta", "152 ventas".
 *
 * El plural regular se arma agregando "s"; cuando no alcanza —"unidad" hace
 * "unidades"— se pasa la forma plural explícita.
 */
export function pluralize(
  quantity: number,
  singular: string,
  plural = `${singular}s`,
) {
  return `${quantity} ${quantity === 1 ? singular : plural}`;
}
