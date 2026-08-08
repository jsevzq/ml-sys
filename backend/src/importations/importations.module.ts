import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ImportationsService } from './importations.service';
import { ImportationsController } from './importations.controller';
import { AdditionalCostTypesService } from './additional-cost-types.service';
import { AdditionalCostTypesController } from './additional-cost-types.controller';
import { StockAllocationService } from './stock-allocation.service';
import { Importation } from './entities/importation.entity';
import { ImportationProduct } from './entities/importation-product.entity';
import { SaleAllocation } from './entities/sale-allocation.entity';
import { AdditionalCost } from './entities/additional-cost.entity';
import { AdditionalCostType } from './entities/additional-cost-type.entity';
import { Item } from '../items/entities/item.entity';
import { Variation } from '../items/entities/variation.entity';
import { Order } from '../orders/entities/order.entity';
import { Adjustment } from './entities/adjustment.entity';
import { SkuEquivalence } from '../items/entities/sku-equivalence.entity';
import { OrderItem } from '../orders/entities/order-item.entity';
import { AdjustmentsService } from './adjustments.service';
import { AdjustmentsController } from './adjustments.controller';
import { SkuEquivalencesService } from './sku-equivalences.service';
import { SkuEquivalencesController } from './sku-equivalences.controller';
import { ConsistencyService } from './consistency.service';
import { ConsistencyController } from './consistency.controller';
import { PerformanceService } from './performance.service';
import { PerformanceController } from './performance.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Importation,
      ImportationProduct,
      SaleAllocation,
      AdditionalCost,
      AdditionalCostType,
      Item,
      Variation,
      Order,
      Adjustment,
      SkuEquivalence,
      OrderItem,
    ]),
  ],
  controllers: [
    ImportationsController,
    AdditionalCostTypesController,
    AdjustmentsController,
    SkuEquivalencesController,
    ConsistencyController,
    PerformanceController,
  ],
  providers: [
    ImportationsService,
    AdditionalCostTypesService,
    StockAllocationService,
    AdjustmentsService,
    SkuEquivalencesService,
    ConsistencyService,
    PerformanceService,
  ],
  exports: [StockAllocationService],
})
export class ImportationsModule {}
