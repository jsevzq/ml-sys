import { Module } from '@nestjs/common';
import { MlModule } from './ml/ml.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { MlClientModule } from './ml-client/ml-client.module';
import { ItemsModule } from './items/items.module';
import { ImportationsModule } from './importations/importations.module';
import { OrdersModule } from './orders/orders.module';
import 'dotenv/config';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT!, 10),
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      // Nunca en true: el esquema lo maneja el CLI de TypeORM con las migraciones
      // de `migrations/`, apuntadas desde `data-source.ts`. La aplicación las lee
      // pero no las corre, así que acá no van declaradas.
      synchronize: false,
      // Imprime cada query con sus parámetros. Útil para depurar, ruidoso siempre,
      // y en un servidor deja datos de clientes en los logs.
      logging: process.env.DB_LOGGING === 'true',
    }),
    AuthModule,
    MlModule,
    MlClientModule,
    ItemsModule,
    ImportationsModule,
    OrdersModule,
  ],
})
export class AppModule {}
