import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AdjustmentKind } from '../entities/adjustment.entity';

export class AdjustmentDto {
  @ApiProperty() id: number;
  @ApiProperty({ enum: AdjustmentKind }) type: AdjustmentKind;
  @ApiProperty() reason: string;
  @ApiProperty() quantity: number;
  @ApiPropertyOptional({ type: String, nullable: true }) occurredAt:
    string | null;
  @ApiProperty() createdAt: string;
  @ApiPropertyOptional({ type: Number, nullable: true }) importationId:
    number | null;
  @ApiPropertyOptional({ type: Number, nullable: true }) importationProductId:
    number | null;
  @ApiPropertyOptional({ type: Number, nullable: true }) orderItemId:
    number | null;
  @ApiPropertyOptional({ type: String, nullable: true }) orderId: string | null;
  @ApiPropertyOptional({ type: String, nullable: true }) sourceTitle:
    string | null;
  @ApiPropertyOptional({ type: String, nullable: true }) sourceVariantName:
    string | null;
  @ApiPropertyOptional({ type: String, nullable: true }) sourceSku:
    string | null;
  @ApiPropertyOptional({ type: String, nullable: true }) targetTitle:
    string | null;
  @ApiPropertyOptional({ type: String, nullable: true }) targetVariantName:
    string | null;
  @ApiPropertyOptional({ type: String, nullable: true }) targetSku:
    string | null;
}
