export interface MlCallbackParams {
  code: string;
  state: string;
}

export type ParseResult =
  { ok: true; params: MlCallbackParams } | { ok: false; reason: string };

/**
 * Extrae `code` y `state` de lo que el usuario tenga a mano después de autorizar
 * en Mercado Libre: la URL completa a la que lo redirigieron, sólo el query string,
 * o el fragmento pegado desde la barra de direcciones.
 *
 * Hace falta porque ML no acepta `localhost` como redirect_uri: la redirección
 * termina en una URL que no resuelve y los parámetros se traen a mano.
 */
export function parseMlCallbackParams(input: string): ParseResult {
  const trimmed = input.trim();
  if (!trimmed) {
    return {
      ok: false,
      reason: 'Pegue la URL a la que redirigió Mercado Libre.',
    };
  }

  const queryStart = trimmed.indexOf('?');
  const query = (
    queryStart >= 0 ? trimmed.slice(queryStart + 1) : trimmed
  ).replace(/^[#&]/, '');
  const params = new URLSearchParams(query);

  const code = params.get('code')?.trim();
  const state = params.get('state')?.trim();

  if (code && state) return { ok: true, params: { code, state } };

  const faltan = [!code && 'code', !state && 'state']
    .filter(Boolean)
    .join(' y ');
  return {
    ok: false,
    reason: `No encontré ${faltan} en lo que pegaste. Tiene que incluir "?code=...&state=...".`,
  };
}
