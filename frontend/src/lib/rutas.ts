/**
 * Cómo se llama cada pantalla, en un solo lugar.
 *
 * Lo usan el sidebar (para marcar dónde estás) y la cabecera (para decirlo). Antes la
 * cabecera decía "Panel de control" en las siete páginas y el sidebar no resaltaba
 * nada: no había forma de saber en qué pantalla estabas salvo por el contenido.
 */

export interface Ruta {
  url: string;
  title: string;
}

/** Operación diaria. */
export const RUTAS_PRINCIPALES: Ruta[] = [
  { url: '/dashboard', title: 'Resumen' },
  { url: '/products', title: 'Productos' },
  { url: '/sales', title: 'Ventas' },
  { url: '/performance', title: 'Rendimiento' },
];

/** Gestión interna: se toca de a ratos, no todos los días. */
export const RUTAS_INTERNAS: Ruta[] = [
  { url: '/importations', title: 'Importaciones' },
  { url: '/business', title: 'Negocio' },
];

const ALL = [...RUTAS_PRINCIPALES, ...RUTAS_INTERNAS];

/**
 * La ruta a la que pertenece una ubicación. `/products/MLU123` cuenta como
 * `/products`, así que el detalle de un producto deja marcado "Productos".
 */
export function rutaActiva(pathname: string) {
  return ALL.find(
    (ruta) => pathname === ruta.url || pathname.startsWith(`${ruta.url}/`),
  );
}

export function routeTitle(pathname: string) {
  return rutaActiva(pathname)?.title ?? 'Panel de control';
}
