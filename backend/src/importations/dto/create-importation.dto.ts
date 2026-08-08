import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Length,
  Min,
  ValidateNested,
} from 'class-validator';
import { AdditionalCostKind } from '../entities/additional-cost.entity';

export class CreateAdditionalCostDto {
  @ApiProperty({ example: 4, description: 'Id del tipo de costo del catálogo' })
  @IsInt()
  @IsPositive()
  typeId: number;

  @ApiProperty({
    enum: AdditionalCostKind,
    description:
      'fixed = un monto en su moneda; percentage = un porcentaje sobre el costo de la mercadería',
  })
  @IsEnum(AdditionalCostKind)
  kind: AdditionalCostKind;

  @ApiProperty({
    example: 200,
    description: 'El monto si es fijo, el porcentaje si es porcentual',
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  amount: number;

  @ApiPropertyOptional({
    example: 'USD',
    description: 'Sólo para costos fijos',
  })
  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string;

  @ApiPropertyOptional({
    example: 40.5,
    description: 'Sólo para costos fijos en otra moneda. Si falta, se toma 1.',
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 4 })
  @IsPositive()
  exchangeToUYURate?: number;

  @ApiPropertyOptional({ description: 'Cuándo se pagó' })
  @IsOptional()
  @IsDateString()
  paidAt?: string;
}

export class CreateImportationProductDto {
  @ApiPropertyOptional({
    example: 'MLU1234567890',
    description:
      'Publicación importada. Excluyente con variationId: va uno u otro, nunca los dos.',
  })
  @IsOptional()
  @IsString()
  itemId?: string;

  @ApiPropertyOptional({
    example: '111111111111',
    description: 'Variación importada',
  })
  @IsOptional()
  @IsString()
  variationId?: string;

  @ApiProperty({ example: 100, description: 'Unidades compradas' })
  @IsInt()
  @IsPositive()
  quantity: number;

  @ApiProperty({ example: 4.35, description: 'Precio unitario de compra' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  price: number;

  @ApiProperty({ example: 'USD', description: 'Moneda del precio de compra' })
  @IsString()
  @Length(3, 3)
  currency: string;

  @ApiProperty({
    example: 40.5,
    description:
      'Cuántos pesos vale una unidad de `currency` en esta importación',
  })
  @IsNumber({ maxDecimalPlaces: 4 })
  @IsPositive()
  exchangeToUYURate: number;
}

export class CreateImportationDto {
  @ApiProperty({
    example: '2026-03-01',
    description: 'Cuándo se hizo la compra',
  })
  @IsDateString()
  orderDate: string;

  @ApiProperty({
    example: '2026-04-15',
    description:
      'Cuándo llegó. Es la fecha que ordena el FIFO: un lote no puede haber surtido una venta anterior.',
  })
  @IsDateString()
  arrivalDate: string;

  @ApiProperty({ type: [CreateImportationProductDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateImportationProductDto)
  products: CreateImportationProductDto[];

  @ApiPropertyOptional({
    type: [CreateAdditionalCostDto],
    description:
      'Flete, despachante, régimen aduanero: todo lo que no es mercadería',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateAdditionalCostDto)
  additionalCosts?: CreateAdditionalCostDto[];
}
