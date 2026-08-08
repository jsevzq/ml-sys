import { describe, expect, it } from 'vitest';
import {
  stockStatus,
  necesitaAtencion,
  UMBRAL_STOCK_BAJO,
  UMBRAL_STOCK_CRITICO,
} from './stock-status';

describe('estadoDeStock', () => {
  it('cero es agotado', () => {
    expect(stockStatus(0)).toBe('agotado');
  });

  // Un stock negativo no debería existir, pero si el catálogo lo devuelve la
  // pantalla tiene que decir "agotado" y no romperse.
  it('un negativo también cuenta como agotado', () => {
    expect(stockStatus(-2)).toBe('agotado');
  });

  it('por debajo del umbral crítico es crítico', () => {
    expect(stockStatus(1)).toBe('critico');
    expect(stockStatus(UMBRAL_STOCK_CRITICO - 1)).toBe('critico');
  });

  // El umbral crítico es el primer valor que ya no es crítico: si estuviera
  // incluido, "menos de 3" y "3 o menos" darían lo mismo y el nombre mentiría.
  it('el umbral crítico exacto ya es stock bajo', () => {
    expect(stockStatus(UMBRAL_STOCK_CRITICO)).toBe('bajo');
  });

  it('el umbral bajo exacto sigue siendo bajo', () => {
    expect(stockStatus(UMBRAL_STOCK_BAJO)).toBe('bajo');
  });

  it('por encima del umbral bajo está disponible', () => {
    expect(stockStatus(UMBRAL_STOCK_BAJO + 1)).toBe('disponible');
    expect(stockStatus(120)).toBe('disponible');
  });
});

describe('necesitaAtencion', () => {
  it('es verdadero para todo lo que no está disponible', () => {
    expect(necesitaAtencion(0)).toBe(true);
    expect(necesitaAtencion(1)).toBe(true);
    expect(necesitaAtencion(UMBRAL_STOCK_BAJO)).toBe(true);
  });

  it('es falso cuando hay stock de sobra', () => {
    expect(necesitaAtencion(UMBRAL_STOCK_BAJO + 1)).toBe(false);
  });
});
