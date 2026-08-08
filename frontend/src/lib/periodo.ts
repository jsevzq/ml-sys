/** Ventana de tiempo que se le pide al backend. */
export interface Period {
  from?: string;
  to?: string;
}

export type PeriodKey = '30d' | '90d' | '12m' | 'anio' | 'todo';

/**
 * Presets en vez de un selector de rango libre.
 *
 * Con veinte meses de historia, las preguntas reales son "cómo viene el mes",
 * "cómo va el año" y "todo"; un calendario doble para elegir dos fechas exactas
 * es más trabajo del que la respuesta vale. Si algún día hace falta un rango
 * arbitrario, se agrega como una opción más.
 */
export const PERIODS: { key: PeriodKey; name: string }[] = [
  { key: '30d', name: '30 días' },
  { key: '90d', name: '90 días' },
  { key: '12m', name: '12 meses' },
  { key: 'anio', name: 'Este año' },
  { key: 'todo', name: 'Todo' },
];

/**
 * El comienzo del día de hace N días.
 *
 * **Tiene que ser estable dentro del mismo día.** Devolver `new Date()` a secas
 * daba un `from` distinto en cada render, con los milisegundos corridos: eso
 * cambia la clave de la consulta, que dispara un refetch, que vuelve a
 * renderizar, que genera otra clave. La pantalla quedaba pidiendo `/orders` en
 * bucle sin llegar a dibujar nada.
 *
 * Truncar al día además es lo que la etiqueta promete: "últimos 30 días" son
 * días, no instantes.
 */
const daysAgo = (days: number): string => {
  const from = new Date();
  from.setDate(from.getDate() - days);
  from.setHours(0, 0, 0, 0);
  return from.toISOString();
};

export function periodRange(key: PeriodKey): Period {
  switch (key) {
    case '30d':
      return { from: daysAgo(30) };
    case '90d':
      return { from: daysAgo(90) };
    case '12m':
      return { from: daysAgo(365) };
    case 'anio': {
      const enero = new Date(new Date().getFullYear(), 0, 1);
      enero.setHours(0, 0, 0, 0);
      return { from: enero.toISOString() };
    }
    case 'todo':
      return {};
  }
}
