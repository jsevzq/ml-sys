import { afterEach, describe, expect, it, vi } from 'vitest';
import { PERIODS, periodRange } from './periodo';

afterEach(() => {
  vi.useRealTimers();
});

/** Congela el reloj para que las fechas relativas sean comprobables. */
function onDate(iso: string) {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(iso));
}

describe('rangoDePeriodo', () => {
  it("'todo' no acota nada: el backend devuelve el historial completo", () => {
    expect(periodRange('todo')).toEqual({});
  });

  it('cuenta los días hacia atrás desde hoy', () => {
    onDate('2026-08-07T12:00:00Z');
    expect(periodRange('30d').from?.slice(0, 10)).toBe('2026-07-08');
    expect(periodRange('90d').from?.slice(0, 10)).toBe('2026-05-09');
  });

  it("'este año' arranca el 1 de enero", () => {
    onDate('2026-08-07T12:00:00Z');
    expect(periodRange('anio').from?.slice(0, 4)).toBe('2026');
    expect(new Date(periodRange('anio').from!).getFullYear()).toBe(2026);
  });

  // Un rango con `to` cerraría la ventana en el pasado y escondería las ventas
  // de hoy: todos los presets son "desde X hasta ahora".
  it('ningún preset pone tope superior', () => {
    for (const { key } of PERIODS) {
      expect(periodRange(key).to).toBeUndefined();
    }
  });

  it('cada preset devuelve una fecha ISO válida', () => {
    for (const { key } of PERIODS) {
      const { from } = periodRange(key);
      if (from) expect(Number.isNaN(Date.parse(from))).toBe(false);
    }
  });

  /**
   * El valor tiene que ser idéntico entre llamadas del mismo día.
   *
   * Es la clave de la consulta de TanStack Query: si cambia en cada render, el
   * refetch dispara otro render, que genera otra clave, y la pantalla queda
   * pidiendo `/orders` en bucle sin dibujar nada. Pasó con los presets de días,
   * que arrastraban los milisegundos de `new Date()`.
   */
  it('es estable entre llamadas: si no, el listado entra en bucle', () => {
    onDate('2026-08-07T15:32:41.716Z');

    for (const { key } of PERIODS) {
      const first = periodRange(key);
      // Dos renders no ocurren en el mismo milisegundo: sin avanzar el reloj,
      // el test pasaría aun con el bug.
      vi.advanceTimersByTime(37);
      const segunda = periodRange(key);
      expect(segunda).toEqual(first);
    }
  });

  it('los presets por días arrancan a medianoche', () => {
    onDate('2026-08-07T15:32:41.716Z');
    for (const key of ['30d', '90d', '12m', 'anio'] as const) {
      const { from } = periodRange(key);
      expect(new Date(from!).getHours()).toBe(0);
      expect(new Date(from!).getMinutes()).toBe(0);
      expect(new Date(from!).getSeconds()).toBe(0);
      expect(new Date(from!).getMilliseconds()).toBe(0);
    }
  });
});
