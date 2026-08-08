import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Transform, Type } from 'class-transformer';
import { OrderItemDto } from './order-item.dto';
import { ShipmentDto } from './shipment.dto';
import {
  shippingBalanceOf,
  saleCommission,
  saleNet,
} from '../lib/order-amounts';
import { Order } from '../entities/order.entity';

export class OrderDto {
  @ApiProperty({ example: '2000012345678901' })
  @Expose()
  id: string;

  @ApiProperty({ example: 'paid' })
  @Expose()
  status: string;

  @ApiProperty()
  @Expose()
  dateCreated: Date;

  @ApiPropertyOptional()
  @Expose()
  dateClosed?: Date;

  @ApiProperty()
  @Expose()
  dateLastUpdated: Date;

  @ApiProperty({ example: 916.96 })
  @Expose()
  @Type(() => Number)
  totalAmount: number;

  @ApiPropertyOptional({ example: 916.96 })
  @Expose()
  @Type(() => Number)
  paidAmount?: number;

  @ApiProperty({ example: 'UYU' })
  @Expose()
  currencyId: string;

  @ApiPropertyOptional({ example: null })
  @Expose()
  @Type(() => Number)
  shippingCost?: number;

  @ApiProperty({ example: 0 })
  @Expose()
  @Type(() => Number)
  couponAmount: number;

  @ApiPropertyOptional({
    example: '2000012345678902',
    description: 'Varias órdenes de un mismo carrito comparten pack y envío',
  })
  @Expose()
  packId?: string;

  @ApiPropertyOptional({ example: 'URURELOJES' })
  @Expose()
  buyerNickname?: string;

  @ApiPropertyOptional({ type: ShipmentDto })
  @Expose()
  @Type(() => ShipmentDto)
  shipment?: ShipmentDto;

  @ApiProperty({ type: [OrderItemDto] })
  @Expose()
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @ApiProperty({
    example: 161.96,
    description:
      'Comisión total de ML: saleFee por unidad, sumado de todas las líneas',
  })
  @Expose()
  @Transform(({ obj }: { obj: Order }) => saleCommission(obj.items), {
    toClassOnly: true,
  })
  commissionAmount: number;

  @ApiProperty({
    example: -125,
    description:
      'Impacto del envío en la liquidación: negativo si lo paga el vendedor, positivo si lo cobra (Flex). Prorrateado si varias ventas comparten el envío.',
  })
  @Expose()
  @Transform(({ obj }: { obj: Order }) => shippingBalanceOf(obj.shipment), {
    toClassOnly: true,
  })
  shippingBalance: number;

  @ApiProperty({
    example: 830,
    description:
      'Lo que ML deposita por esta venta. Coincide con el "Total" de su reporte de ventas. Cero si la venta está cancelada.',
  })
  @Expose()
  @Transform(({ obj }: { obj: Order }) => saleNet(obj), {
    toClassOnly: true,
  })
  netAmount: number;
}
