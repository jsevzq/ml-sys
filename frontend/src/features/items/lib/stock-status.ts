/**
 * El estado de stock de un producto, en un solo lugar.
 *
 * Antes cada pantalla decidía su propio color con clases sueltas (`text-emerald-500`
 * acá, `bg-amber-500` allá) y los umbrales estaban duplicados. El mismo producto podía
 * verse "en verde" en una pantalla y neutro en otra, que es justo lo que hace que el
 * operador deje de confiar en el color. Ahora hay cuatro estados con nombre, y el color
 * sale de los tokens del tema (`--success`, `--warning`, `--destructive`).
 *
 * Los umbrales son los que ya usaba el sistema: se mantienen, sólo se les puso nombre.
 */

export type StockStatus = 'agotado' | 'critico' | 'bajo' | 'disponible';

/**
 * Los dos números que definen todo esto. Cambiarlos acá los cambia en las cuatro
 * pantallas.
 *
 * Estaban en 10 y 4, heredados, y con el catálogo real dejaban 20 de 21
 * publicaciones marcadas como "necesita atención": una alerta que abarca todo no
 * alerta de nada. Bajados a 5 y 3, la distribución separa de verdad (7 agotadas,
 * 5 críticas, 4 bajas, 5 en orden). Igual son una estimación: el número correcto
 * depende de cuánto tarda en llegar una importación y a qué ritmo vende cada
 * producto, y eso lo sabe el negocio, no el código.
 */
export const UMBRAL_STOCK_BAJO = 5;
/** Por debajo de acá el reposicionamiento es urgente. */
export const UMBRAL_STOCK_CRITICO = 3;

export function stockStatus(quantity: number): StockStatus {
  if (quantity <= 0) return 'agotado';
  if (quantity < UMBRAL_STOCK_CRITICO) return 'critico';
  if (quantity <= UMBRAL_STOCK_BAJO) return 'bajo';
  return 'disponible';
}

/** True para los estados que piden una acción de reposición. */
export function necesitaAtencion(quantity: number) {
  return stockStatus(quantity) !== 'disponible';
}

interface PresentacionDeStock {
  label: string;
  /** Color del número de stock. */
  text: string;
  /** Relleno para barras de progreso y puntos de estado. */
  fondo: string;
  variant: 'success' | 'warning' | 'destructive';
}

export const STOCK_STATUS: Record<StockStatus, PresentacionDeStock> = {
  agotado: {
    label: 'Agotado',
    text: 'text-destructive',
    fondo: 'bg-destructive',
    variant: 'destructive',
  },
  critico: {
    label: 'Stock crítico',
    text: 'text-destructive',
    fondo: 'bg-destructive',
    variant: 'destructive',
  },
  bajo: {
    label: 'Stock bajo',
    text: 'text-warning',
    fondo: 'bg-warning',
    variant: 'warning',
  },
  disponible: {
    label: 'Disponible',
    text: 'text-success',
    fondo: 'bg-success',
    variant: 'success',
  },
};

export function presentacionDeStock(quantity: number) {
  return STOCK_STATUS[stockStatus(quantity)];
}

/** Color del número de stock. Reemplaza al viejo `stockColorClass`. */
export function stockTextClass(quantity: number) {
  return presentacionDeStock(quantity).text;
}

/**
 * Salud de la publicación (0–1). Es otra escala —la calidad del anuncio, no el
 * inventario— pero comparte la paleta de estados para no inventar colores nuevos.
 */
export function healthColorClass(health: number) {
  if (health >= 0.7) return 'bg-success';
  if (health >= 0.4) return 'bg-warning';
  return 'bg-destructive';
}
