import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';

export class ShipmentDto {
  @ApiProperty({ example: '11111111111' })
  @Expose()
  id: string;

  @ApiPropertyOptional({ example: 'delivered' })
  @Expose()
  status?: string;

  @ApiPropertyOptional({
    example: 'self_service',
    description: 'self_service = Flex, xd_drop_off = agencia',
  })
  @Expose()
  logisticType?: string;

  @ApiPropertyOptional({
    example: 135.2,
    description: 'Lo que pagó el vendedor por el envío',
  })
  @Expose()
  @Type(() => Number)
  senderCost?: number;

  @ApiPropertyOptional({ example: 0, description: 'Lo que pagó el comprador' })
  @Expose()
  @Type(() => Number)
  receiverCost?: number;

  @ApiPropertyOptional({
    example: 33.8,
    description: 'Bonificación de ML sobre el costo del envío',
  })
  @Expose()
  @Type(() => Number)
  senderDiscount?: number;

  @ApiPropertyOptional({ example: 338 })
  @Expose()
  @Type(() => Number)
  grossAmount?: number;

  @ApiPropertyOptional({ example: '11111111112' })
  @Expose()
  trackingNumber?: string;
}
