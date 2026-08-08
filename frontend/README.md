# MH · Frontend

Interfaz de MH. React 19 sobre Vite, con shadcn/ui y TanStack Query. Ver el [README raíz](../README.md) para el panorama del proyecto y cómo levantarlo.

## Comandos

```bash
npm run dev                # http://localhost:5173
npm test                   # 60 tests
npm run lint
npm run typecheck
npm run build              # typecheck + bundle
npm run generate:api       # regenera el cliente de la API (requiere el backend levantado)
```

## El cliente de la API no se escribe a mano

`npm run generate:api` corre [Orval](orval.config.ts), que lee el Swagger del backend en `http://localhost:3000/api-json` y genera en `src/api/generated/` los tipos y un hook de React Query por endpoint.

Lo generado **está versionado**, así que un clon compila sin levantar el backend. Sólo hay que regenerarlo cuando cambia un contrato del backend, y el cambio queda visible en el diff.

## Cómo está organizado

Cada dominio vive en `src/features/<dominio>/` con su `api/`, sus `components/`, su `lib/` y un índice que define qué exporta. Las páginas de `src/pages/` sólo componen features. Todo lo que vive en el backend se maneja con TanStack Query; en Zustand queda únicamente el token de sesión.

Los tests cubren la lógica pura de `lib/` —filtros, formato, períodos, presentación de ventas—, que es la que tiene reglas propias y se puede romper sin que nadie lo note.
