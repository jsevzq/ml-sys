import { defineConfig } from 'orval';

export default defineConfig({
  mlInventory: {
    input: 'http://localhost:3000/api-json', // URL donde Nest expone el JSON
    output: {
      mode: 'tags-split', // Crea un archivo por cada controlador (Items, Auth, etc.)
      target: './src/api/generated/endpoints.ts',
      schemas: './src/api/generated/models', // Aquí irán tus interfaces/tipos
      client: 'react-query', // Genera hooks useQuery/useMutation listos para usar
      httpClient: 'axios',
      override: {
        mutator: {
          path: './src/services/orval-fetcher.ts', // Tu instancia personalizada con interceptores
          name: 'customInstance',
        },
      },
    },
  },
});