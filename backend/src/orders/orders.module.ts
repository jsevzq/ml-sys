import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { Shipment } from './entities/shipment.entity';
import { Item } from '../items/entities/item.entity';
import { Variation } from '../items/entities/variation.entity';
import { MlUser } from '../ml/entities/ml-user.entity';
import { MlClientModule } from '../ml-client/ml-client.module';
import { ImportationsModule } from '../importations/importations.module';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Order,
      OrderItem,
      Shipment,
      Item,
      Variation,
      MlUser,
    ]),
    MlClientModule,
    ImportationsModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
