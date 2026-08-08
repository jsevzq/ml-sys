import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsISO8601,
  IsOptional,
  IsPositive,
  IsString,
  MinLength,
} from 'class-validator';
import { AdjustmentKind } from '../entities/adjustment.entity';

export class CreateAdjustmentDto {
  @ApiProperty({ enum: AdjustmentKind })
  @IsEnum(AdjustmentKind)
  type: AdjustmentKind;

  /** Por qué pasó. Es lo que vuelve útil a la subsanación dentro de seis meses. */
  @ApiProperty()
  @IsString()
  @MinLength(3)
  reason: string;

  @ApiProperty({ default: 1 })
  @IsInt()
  @IsPositive()
  quantity: number = 1;

  /** Línea del lote que pierde las unidades. Destrucción y mutación. */
  @ApiPropertyOptional({ type: Number, nullable: true })
  @IsOptional()
  @IsInt()
  importationProductId?: number;

  /** Línea de venta que se despachó con otro producto. Sólo swap. */
  @ApiPropertyOptional({ type: Number, nullable: true })
  @IsOptional()
  @IsInt()
  orderItemId?: number;

  /** En qué se convirtió (mutación) o qué se despachó (swap). */
  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @IsString()
  targetItemId?: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @IsString()
  targetVariationId?: string;

  /** Cuándo ocurrió: ordena el evento en la línea de tiempo. En los swaps sobra. */
  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @IsISO8601()
  occurredAt?: string;
}

/** Lo editable de una subsanación. El origen —línea o venta— no se cambia. */
export class UpdateAdjustmentDto {
  @ApiProperty()
  @IsString()
  @MinLength(3)
  reason: string;

  @ApiProperty()
  @IsInt()
  @IsPositive()
  quantity: number;

  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @IsString()
  targetItemId?: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @IsString()
  targetVariationId?: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @IsISO8601()
  occurredAt?: string;
}
