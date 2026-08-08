import { Module } from '@nestjs/common';
import { MlService } from './ml.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MlUser } from './entities/ml-user.entity';
import { MlController } from './ml.controller';
import { MlConnectionGuard } from './ml-connection.guard';
import { APP_GUARD } from '@nestjs/core';
import { HttpModule } from '@nestjs/axios';
import { CacheModule } from '@nestjs/cache-manager';
import { MlClientModule } from '../ml-client/ml-client.module';
import { ItemsModule } from '../items/items.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([MlUser]),
    HttpModule,
    CacheModule.register(),
    MlClientModule,
    ItemsModule,
  ],
  controllers: [MlController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: MlConnectionGuard,
    },
    MlService,
  ],
  exports: [MlService],
})
export class MlModule {}
