import { buildMap, resolveSku } from './sku-equivalence';

describe('resolverSku', () => {
  const celeste = {
    fromItemId: 'MLU1',
    fromVariationId: '100',
    toItemId: 'MLU1',
    toVariationId: '200',
  };

  it('deja pasar el SKU cuando no hay equivalencia', () => {
    const mapa = buildMap([]);
    expect(
      resolveSku({ mlItemId: 'MLU1', mlVariationId: '100' }, mapa),
    ).toEqual({ mlItemId: 'MLU1', mlVariationId: '100' });
  });

  it('traduce una variante borrada a la que la reemplazó', () => {
    const mapa = buildMap([celeste]);
    expect(
      resolveSku({ mlItemId: 'MLU1', mlVariationId: '100' }, mapa),
    ).toEqual({ mlItemId: 'MLU1', mlVariationId: '200' });
  });

  it('sigue la cadena cuando la variante se recreó dos veces', () => {
    const mapa = buildMap([
      celeste,
      {
        fromItemId: 'MLU1',
        fromVariationId: '200',
        toItemId: 'MLU1',
        toVariationId: '300',
      },
    ]);
    expect(
      resolveSku({ mlItemId: 'MLU1', mlVariationId: '100' }, mapa),
    ).toEqual({ mlItemId: 'MLU1', mlVariationId: '300' });
  });

  it('traduce una publicación entera que perdió sus variantes', () => {
    const mapa = buildMap([
      {
        fromItemId: 'MLU1',
        fromVariationId: '100',
        toItemId: 'MLU2',
        toVariationId: null,
      },
    ]);
    expect(
      resolveSku({ mlItemId: 'MLU1', mlVariationId: '100' }, mapa),
    ).toEqual({ mlItemId: 'MLU2', mlVariationId: null });
  });

  // Un ciclo sólo puede entrar por un error de carga, pero colgar el recálculo
  // entero por eso sería peor que devolver el SKU tal como vino.
  it('no se cuelga ante un ciclo', () => {
    const mapa = buildMap([
      celeste,
      {
        fromItemId: 'MLU1',
        fromVariationId: '200',
        toItemId: 'MLU1',
        toVariationId: '100',
      },
    ]);
    expect(
      resolveSku({ mlItemId: 'MLU1', mlVariationId: '100' }, mapa),
    ).toEqual({ mlItemId: 'MLU1', mlVariationId: '100' });
  });
});
