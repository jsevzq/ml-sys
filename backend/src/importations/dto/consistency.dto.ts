import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum InconsistencyKind {
  /** Se vendieron unidades que a esa fecha todavía no habían llegado. */
  SALE_WITHOUT_STOCK = 'sale_without_stock',
  /** Los lotes tienen más de lo que Mercado Libre cuenta. */
  SURPLUS_IN_LOTS = 'surplus_in_lots',
  /** Mercado Libre tiene stock que no salió de ningún lote. */
  MISSING_IN_LOTS = 'missing_in_lots',
}

export class InconsistencyDto {
  @ApiProperty({ enum: InconsistencyKind }) type: InconsistencyKind;
  @ApiPropertyOptional({ type: String, nullable: true }) title: string | null;
  @ApiPropertyOptional({ type: String, nullable: true }) variantName:
    string | null;
  @ApiPropertyOptional({ type: String, nullable: true }) mlItemId:
    string | null;
  @ApiPropertyOptional({ type: String, nullable: true }) mlVariationId:
    string | null;
  @ApiProperty({ description: 'Unidades en juego' }) units: number;
  @ApiPropertyOptional({ type: Number, nullable: true }) systemStock:
    number | null;
  @ApiPropertyOptional({ type: Number, nullable: true }) mlStock: number | null;
  @ApiPropertyOptional({ type: String, nullable: true }) occurredAt:
    string | null;
  @ApiProperty() detail: string;
}

export class ConsistencyReportDto {
  @ApiProperty({ type: InconsistencyDto, isArray: true })
  inconsistencies: InconsistencyDto[];

  @ApiProperty() total: number;
  @ApiProperty({ description: 'Unidades descuadradas en total' }) units: number;
}
