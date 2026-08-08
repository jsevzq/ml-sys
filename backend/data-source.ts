import { DataSource } from 'typeorm';
import 'dotenv/config';

/**
 * La conexión que usa el CLI de TypeORM para generar y correr migraciones.
 *
 * Vive fuera de `src/` a propósito: el CLI la carga por su cuenta, sin levantar la
 * aplicación. La de la aplicación se declara en `src/app.module.ts` y no declara
 * migraciones, porque no las ejecuta.
 */
export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT!, 10),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  entities: [__dirname + '/src/**/*.entity{.ts,.js}'],
  synchronize: false,
  logging: process.env.DB_LOGGING === 'true',
  migrations: [__dirname + '/migrations/**/*{.js,.ts}'],
});

