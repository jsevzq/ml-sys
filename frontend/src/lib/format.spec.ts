import { describe, expect, it } from 'vitest';
import { pluralize } from './format';

describe('pluralizar', () => {
  it('usa el singular cuando hay una sola', () => {
    expect(pluralize(1, 'venta')).toBe('1 venta');
  });

  it('pluraliza el resto, incluido el cero', () => {
    expect(pluralize(0, 'venta')).toBe('0 ventas');
    expect(pluralize(152, 'venta')).toBe('152 ventas');
  });

  // "unidad" no pluraliza agregando una "s".
  it('acepta un plural irregular', () => {
    expect(pluralize(1, 'unidad', 'unidades')).toBe('1 unidad');
    expect(pluralize(3, 'unidad', 'unidades')).toBe('3 unidades');
  });
});
