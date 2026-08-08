import { Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
} from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { OrderDto } from './dto/order.dto';
import { OrderListDto, OrderQueryDto } from './dto/order-list.dto';
import { OrderSyncResultDto } from './dto/order-sync-result.dto';
import { OrderSummaryDto } from './dto/order-summary.dto';
import type { MlRequest } from '../ml/ml-connection.guard';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @ApiBearerAuth()
  @ApiOkResponse({ type: OrderListDto })
  @Get()
  async findAll(
    @Req() req: MlRequest,
    @Query() query: OrderQueryDto,
  ): Promise<OrderListDto> {
    return this.ordersService.findAll(req.mlAccount.id, query);
  }

  @ApiBearerAuth()
  @ApiOkResponse({ type: OrderSummaryDto })
  @Get('summary')
  async summary(
    @Req() req: MlRequest,
    @Query() query: OrderQueryDto,
  ): Promise<OrderSummaryDto> {
    return this.ordersService.summary(req.mlAccount.id, query);
  }

  @ApiBearerAuth()
  @ApiOkResponse({ type: OrderSyncResultDto })
  @Post('sync')
  async sync(@Req() req: MlRequest): Promise<OrderSyncResultDto> {
    return this.ordersService.sync(req.mlAccount);
  }

  @ApiBearerAuth()
  @ApiOkResponse({ type: OrderDto })
  @ApiNotFoundResponse({ description: 'La venta no está sincronizada' })
  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @Req() req: MlRequest,
  ): Promise<OrderDto> {
    return this.ordersService.findOne(id, req.mlAccount.id);
  }
}
