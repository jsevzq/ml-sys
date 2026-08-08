/**
 * Paleta de los gráficos.
 *
 * Validada con el verificador de la guía de visualización: banda de luminosidad,
 * piso de croma, separación bajo daltonismo (deuteranopía y tritanopía) y
 * contraste contra la superficie, en claro y en oscuro. No cambiar un valor sin
 * volver a correrlo — dos hues que se ven distintos acá pueden ser el mismo color
 * para una de cada doce personas.
 *
 * Los pasos oscuros no son un volteo automático del claro: son su propia elección
 * de la misma rampa.
 */
export const SERIES = {
  /** Lo que entra: facturación, neto. */
  ingreso: 'var(--serie-ingreso)',
  /** Lo que queda después de pagar la mercadería. */
  ganancia: 'var(--serie-ganancia)',
  /** Lo que cuesta: mercadería, comisiones. */
  costo: 'var(--serie-costo)',
  /** Contexto que no compite con las series. */
  neutro: 'var(--serie-neutro)',
} as const;

/** Corta un monto para el eje: 21.500 → 21,5 k. */
export function shortAmount(value: number): string {
  const absoluto = Math.abs(value);
  if (absoluto >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (absoluto >= 1_000) return `${Math.round(value / 1_000)}k`;
  return String(Math.round(value));
}

const SHORT_MONTH = new Intl.DateTimeFormat('es-UY', {
  month: 'short',
  timeZone: 'UTC',
});

const LONG_MONTH = new Intl.DateTimeFormat('es-UY', {
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});

/**
 * `2026-03` → `mar`, y `2026-01` → `ene 26`.
 *
 * El año sólo aparece en enero. Sin él, una serie de diecinueve meses mostraba
 * "ene" y "mar" dos veces cada uno y no había forma de saber qué año era cuál;
 * ponerlo en los doce meses sería ruido, porque el eje ya viene ordenado.
 */
export function monthLabel(month: string, forzarAño = false): string {
  const date = new Date(`${month}-01T00:00:00Z`);
  // En minúscula a propósito: el ICU de Node devuelve "Mar" y el del navegador
  // "mar" para el mismo locale, así que sin esto la etiqueta depende de dónde
  // corra. Además una etiqueta de eje va recesiva.
  const corto = SHORT_MONTH.format(date).replace('.', '').toLowerCase();
  if (!forzarAño && date.getUTCMonth() !== 0) return corto;
  return `${corto} ${String(date.getUTCFullYear()).slice(2)}`;
}

/**
 * Formateador de ticks para el eje de meses. Además de enero, marca el año en el
 * primer tick: el eje elige qué ticks entran según el ancho y puede saltearse
 * enero por completo, dejando la serie entera sin ninguna referencia de año.
 */
export function monthTick(month: string, index: number): string {
  return monthLabel(month, index === 0);
}

/**
 * Acorta etiquetas que comparten un prefijo largo: en un catálogo donde todo se
 * llama "Pendrive USB 3.2 Metálico - 64 GB", lo único que distingue una barra de
 * otra son los últimos caracteres, y son justo los que se pierden.
 *
 * El prefijo se calcula sobre las etiquetas presentes y se corta en el último
 * separador, para no partir una palabra al medio. Calcularlo en vez de fijarlo a
 * mano es lo que hace que sirva para cualquier familia de productos.
 */
export function stripCommonPrefix(labels: string[]): string[] {
  if (labels.length < 2) return labels;

  let prefijo = labels[0];
  for (const label of labels.slice(1)) {
    let i = 0;
    while (i < prefijo.length && i < label.length && prefijo[i] === label[i])
      i++;
    prefijo = prefijo.slice(0, i);
    if (prefijo === '') return labels;
  }

  // Cortar en el último separador: "0.3" como prefijo dejaría "0mm" y "2mm".
  const cut = Math.max(
    prefijo.lastIndexOf(' - ') + 3,
    prefijo.lastIndexOf(' ') + 1,
  );
  if (cut < 4) return labels;

  return labels.map((label) => label.slice(cut).trim() || label);
}

/** `2026-03` → `marzo de 2026`, para el tooltip. */
export function fullMonth(month: string): string {
  return LONG_MONTH.format(new Date(`${month}-01T00:00:00Z`));
}
