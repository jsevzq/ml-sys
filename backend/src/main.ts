import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import type { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';

/** `localhost`, `127.0.0.1` o `[::1]` en cualquier puerto. */
const LOOPBACK = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\]):\d+$/;

/**
 * Quién puede llamar a la API desde un navegador.
 *
 * En producción se declara la lista exacta en `CORS_ORIGINS`. Sin esa variable
 * sólo se acepta el bucle local, en cualquier puerto: el frontend de desarrollo
 * cambia de puerto solo cuando el 5173 está ocupado, y `localhost` y `127.0.0.1`
 * son orígenes distintos para el navegador aunque sean la misma máquina. Fijar un
 * único origen literal rompe en los dos casos.
 *
 * No es permisivo: un origen de bucle local sólo lo puede presentar algo que ya
 * corre en esta máquina. Cualquier otro queda afuera.
 */
function corsOrigin(): CorsOptions['origin'] {
  const declared = process.env.CORS_ORIGINS?.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (declared?.length) return declared;

  return (origin, callback) => {
    // Sin cabecera `Origin` no hay navegador de por medio: curl, Swagger o el
    // cliente de un test. CORS no aplica.
    if (!origin || LOOPBACK.test(origin)) return callback(null, true);
    callback(new Error(`Origen no permitido por CORS: ${origin}`));
  };
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const config = new DocumentBuilder()
    .setTitle('MH')
    .addBearerAuth({
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
    })
    .build();
  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, documentFactory);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableCors({ origin: corsOrigin(), credentials: true });

  await app.listen(process.env.PORT ?? 3000);
}

void bootstrap();
