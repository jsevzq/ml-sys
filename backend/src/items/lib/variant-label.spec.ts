import { variantLabel } from './variant-label';

describe('etiquetaDeVariante', () => {
  it('antepone el nombre del atributo al valor', () => {
    expect(
      variantLabel([{ attribute: { name: 'Color' }, valueName: 'Verde' }]),
    ).toBe('Color: Verde');
  });

  it('junta varios atributos', () => {
    expect(
      variantLabel([
        { attribute: { name: 'Color' }, valueName: 'Verde' },
        { attribute: { name: 'Diámetro' }, valueName: '0.30 mm' },
      ]),
    ).toBe('Color: Verde · Diámetro: 0.30 mm');
  });

  it('cae al valor suelto si no se cargó el atributo', () => {
    expect(variantLabel([{ valueName: 'Verde' }])).toBe('Verde');
  });

  it('devuelve null cuando no hay atributos', () => {
    expect(variantLabel([])).toBeNull();
    expect(variantLabel()).toBeNull();
  });
});
