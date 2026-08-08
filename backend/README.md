# MH · Backend

API de MH. NestJS 11 sobre TypeORM y PostgreSQL. Ver el [README raíz](../README.md) para el panorama del proyecto y cómo levantarlo.

## Comandos

```bash
npm run start:dev          # desarrollo con recarga · http://localhost:3000
npm run seed:demo          # datos de demostración (se niega a pisar datos existentes)
npm test                   # 140 tests
npm run lint               # sin autofix, como en CI
npm run typecheck
npm run build
```

## Esquema

El esquema **no** se sincroniza desde las entidades: `synchronize` está en `false` y cada cambio pasa por una migración.

```bash
npm run migration:generate -- migrations/NombreDelCambio   # diffea entidades contra la base
npm run migration:run
npm run migration:revert
```

El CLI usa [`data-source.ts`](data-source.ts), que vive fuera de `src/` porque se carga sin levantar la aplicación. La conexión de la aplicación está en [`src/app.module.ts`](src/app.module.ts) y no declara migraciones: no las ejecuta.

## Estructura

| Módulo | Qué resuelve |
|---|---|
| `auth` | Registro, login y el guard global de JWT, con escape `@Public()` |
| `ml` | OAuth con Mercado Libre, sincronización y el guard de cuenta vinculada |
| `ml-client` | Cliente HTTP de la API de Mercado Libre, con refresco de token |
| `items` | Catálogo. Espejo de sólo lectura: no expone escritura |
| `orders` | Ventas, envíos y las reglas de liquidación |
| `importations` | Lotes, costos adicionales, atribución FIFO, subsanaciones, equivalencias y rentabilidad |

La lógica que decide plata está aislada en `lib/` dentro de cada módulo, sin dependencias de Nest ni de TypeORM: `order-amounts`, `landed-cost`, `fifo`, `expected-value`, `sku-equivalence`. Es donde está la mayoría de los tests.

## Documentación de la API

Swagger en `http://localhost:3000/api` con el backend levantado. El JSON en `/api-json` es lo que consume Orval para generar el cliente del frontend.
