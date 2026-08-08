import { describe, expect, it } from 'vitest';
import { stripCommonPrefix, monthLabel, shortAmount } from './chart-theme';

describe('montoCorto', () => {
  it('deja los montos chicos como están', () => {
    expect(shortAmount(0)).toBe('0');
    expect(shortAmount(842)).toBe('842');
  });

  it('pasa a miles y a millones', () => {
    expect(shortAmount(21_500)).toBe('22k');
    expect(shortAmount(1_250_000)).toBe('1.3M');
  });

  it('conserva el signo de los negativos', () => {
    expect(shortAmount(-9_800)).toBe('-10k');
  });
});

describe('etiquetaDeMes', () => {
  it('muestra sólo el mes cuando no es enero', () => {
    expect(monthLabel('2026-03')).toBe('mar');
  });

  // Una serie de dieciocho meses tiene dos "mar" y sin el año no hay forma de
  // saber cuál es cuál.
  it('marca el año en enero', () => {
    expect(monthLabel('2026-01')).toBe('ene 26');
  });

  it('lo fuerza cuando se lo piden, para el primer tick del eje', () => {
    expect(monthLabel('2025-08', true)).toBe('ago 25');
  });
});

describe('acortarEtiquetas', () => {
  it('saca el prefijo que comparten todas', () => {
    expect(
      stripCommonPrefix([
        'Pendrive USB 3.2 Metálico - 64 GB',
        'Pendrive USB 3.2 Metálico - 128 GB',
      ]),
    ).toEqual(['64 GB', '128 GB']);
  });

  // Cortar por caracteres dejaría "0mm" y "2mm": el prefijo común llega hasta
  // "…0.3" y hay que retroceder al último separador.
  it('no parte una palabra al medio', () => {
    const output = stripCommonPrefix([
      'Cable USB-C - 0.30mm',
      'Cable USB-C - 0.32mm',
    ]);
    expect(output).toEqual(['0.30mm', '0.32mm']);
  });

  it('deja las etiquetas intactas si no comparten prefijo', () => {
    const entry = ['Hub USB-C 6 En 1', 'Soporte Para Notebook'];
    expect(stripCommonPrefix(entry)).toEqual(entry);
  });

  it('no toca una sola etiqueta, que no tiene con qué compararse', () => {
    expect(stripCommonPrefix(['Pendrive 64 GB'])).toEqual(['Pendrive 64 GB']);
  });

  // Si una etiqueta es prefijo de la otra, recortar la dejaría vacía.
  it('no vacía una etiqueta contenida en otra', () => {
    const output = stripCommonPrefix(['Pendrive 64 GB', 'Pendrive 64 GB Negro']);
    expect(output.every((label) => label.length > 0)).toBe(true);
  });
});
