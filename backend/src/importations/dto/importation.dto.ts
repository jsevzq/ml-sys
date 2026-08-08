import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AdditionalCostKind } from '../entities/additional-cost.entity';

export class AdditionalCostDto {
  @ApiProperty({ example: 9 })
  id: number;

  @ApiProperty({ example: 4 })
  typeId: number;

  @ApiProperty({ example: 'Régimen simplificado' })
  typeName: string;

  @ApiProperty({ enum: AdditionalCostKind })
  kind: AdditionalCostKind;

  @ApiProperty({
    example: 60,
    description: 'El monto si es fijo, el porcentaje si es porcentual',
  })
  amount: number;

  @ApiPropertyOptional({ type: String, nullable: true, example: 'USD' })
  currency: string | null;

  @ApiPropertyOptional({ type: Number, nullable: true, example: 40.5 })
  exchangeToUYURate: number | null;

  @ApiPropertyOptional({ type: String, nullable: true, format: 'date-time' })
  paidAt: Date | null;

  @ApiProperty({
    example: 8100,
    description: 'Cuánto suma este costo a la importación, en pesos',
  })
  amountUYU: number;
}

export class ImportationProductDto {
  @ApiProperty({ example: 12 })
  id: number;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    example: 'MLU1234567890',
  })
  itemId: string | null;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    example: '111111111111',
  })
  variationId: string | null;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    example: 'Pendrive USB 3.2 Metálico',
  })
  title: string | null;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    example: 'Capacidad: 64 GB',
    description:
      'Atributos de la variación, con el nombre del atributo adelante',
  })
  variantName: string | null;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description:
      'Foto de la variante, o la de la publicación si no tiene propia',
  })
  imageUrl: string | null;

  @ApiProperty({ example: 100 })
  quantity: number;

  @ApiProperty({
    example: 42,
    description: 'Unidades ya vendidas según la atribución FIFO',
  })
  quantitySold: number;

  @ApiProperty({
    example: 1,
    description: 'Unidades que salieron por una subsanación, sin venderse',
  })
  quantityAdjusted: number;

  @ApiPropertyOptional({
    type: Number,
    nullable: true,
    description: 'Id de la mutación que generó esta línea; null si se compró',
  })
  generatedByAdjustmentId: number | null;

  @ApiProperty({ example: 58 })
  quantityRemaining: number;

  @ApiProperty({ example: 4.35, description: 'Precio unitario de compra' })
  price: number;

  @ApiProperty({ example: 'USD' })
  currency: string;

  @ApiProperty({ example: 40.5 })
  exchangeToUYURate: number;

  @ApiProperty({
    example: 17617.5,
    description: 'Sólo la mercadería, en pesos',
  })
  merchandiseCostUYU: number;

  @ApiProperty({
    example: 4200,
    description:
      'Parte de los costos adicionales que le tocó, prorrateada por valor',
  })
  additionalCostUYU: number;

  @ApiProperty({ example: 21817.5, description: 'Mercadería + adicionales' })
  totalCostUYU: number;

  @ApiProperty({
    example: 218.18,
    description: 'Costo real de una unidad puesta en depósito',
  })
  unitCostUYU: number;

  @ApiPropertyOptional({
    type: Number,
    nullable: true,
    example: 916.96,
    description:
      'Precio de lista en Mercado Libre cuando se cargó la importación. Null si no se conocía',
  })
  expectedUnitPriceUYU: number | null;

  @ApiPropertyOptional({
    type: Number,
    nullable: true,
    example: 7550,
    description:
      'Lo que se esperaba cobrar por esta línea entera, ya sin la comisión',
  })
  expectedNetUYU: number | null;
}

export class ImportationDto {
  @ApiProperty({ example: 3 })
  id: number;

  @ApiProperty()
  orderDate: Date;

  @ApiProperty()
  arrivalDate: Date;

  @ApiProperty({ type: [ImportationProductDto] })
  products: ImportationProductDto[];

  @ApiProperty({ type: [AdditionalCostDto] })
  additionalCosts: AdditionalCostDto[];

  @ApiProperty({ example: 300 })
  totalUnits: number;

  @ApiProperty({ example: 128 })
  soldUnits: number;

  @ApiProperty({
    example: 2,
    description: 'Unidades que salieron por subsanaciones en vez de venderse',
  })
  adjustedUnits: number;

  @ApiProperty({
    example: 42.7,
    description: 'Porcentaje del lote ya vendido, en unidades',
  })
  soldPercentage: number;

  @ApiProperty({
    example: 52852.5,
    description: 'Costo de la mercadería, en pesos',
  })
  merchandiseUYU: number;

  @ApiProperty({ example: 12600, description: 'Costos adicionales, en pesos' })
  additionalUYU: number;

  @ApiProperty({
    example: 65452.5,
    description: 'Capital invertido: mercadería + costos adicionales',
  })
  investedUYU: number;

  @ApiProperty({
    example: 226500,
    description:
      'Lo que se esperaba cobrar por el lote entero, calculado con los precios de lista del día que se cargó. Foto congelada: no se recalcula',
  })
  expectedNetUYU: number;

  @ApiProperty({
    example: 161047.5,
    description: 'Ganancia esperada: el neto esperado menos lo invertido',
  })
  expectedProfitUYU: number;

  @ApiProperty({
    example: 246.05,
    description: 'Ganancia esperada sobre lo invertido, en porcentaje',
  })
  expectedRoi: number;
}
