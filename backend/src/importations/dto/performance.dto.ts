import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MonthPerformanceDto {
  @ApiProperty({ example: '2026-03' }) month: string;
  @ApiProperty() units: number;
  @ApiProperty({ description: 'Neto de ML, ya sin comisión ni envío' })
  revenue: number;
  @ApiProperty({ description: 'Costo de la mercadería vendida' }) cogs: number;
  @ApiProperty() grossProfit: number;
}

export class ProductPerformanceDto {
  @ApiProperty() sku: string;
  @ApiProperty() title: string;
  @ApiPropertyOptional({ type: String, nullable: true }) variantName:
    string | null;
  @ApiProperty() units: number;
  @ApiProperty() revenue: number;
  @ApiProperty() cogs: number;
  @ApiProperty() grossProfit: number;
  @ApiProperty() marginPct: number;
}

export class LotPerformanceDto {
  @ApiProperty() id: number;
  @ApiProperty() arrivalDate: string;
  @ApiProperty() invested: number;
  @ApiProperty() units: number;
  @ApiProperty() soldUnits: number;
  @ApiProperty() revenue: number;
  @ApiProperty() cogs: number;
  @ApiProperty() grossProfit: number;
  @ApiProperty({ description: 'Ganancia sobre lo invertido en el lote entero' })
  roi: number;
  @ApiProperty({ description: 'Qué porcentaje de lo invertido ya volvió' })
  recoveredPct: number;
  @ApiProperty() unitsPerDay: number;
  @ApiPropertyOptional({
    type: Number,
    nullable: true,
    description: 'Días hasta agotarlo al ritmo actual; null si ya se agotó',
  })
  daysToSellOut: number | null;
}

export class PerformanceReportDto {
  @ApiProperty({ description: 'Neto de ML de todo lo que salió de un lote' })
  revenue: number;
  @ApiProperty() cogs: number;
  @ApiProperty() grossProfit: number;
  @ApiProperty() marginPct: number;
  @ApiProperty() soldUnits: number;
  @ApiProperty({ description: 'Capital puesto en todas las importaciones' })
  invested: number;
  @ApiProperty({ description: 'Costo de lo que todavía está en stock' })
  stockValue: number;
  @ApiProperty() roi: number;
  @ApiProperty({ type: MonthPerformanceDto, isArray: true })
  byMonth: MonthPerformanceDto[];
  @ApiProperty({ type: ProductPerformanceDto, isArray: true })
  byProduct: ProductPerformanceDto[];
  @ApiProperty({ type: LotPerformanceDto, isArray: true })
  byLot: LotPerformanceDto[];
}
