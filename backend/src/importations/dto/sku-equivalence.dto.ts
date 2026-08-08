import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';

export class CreateSkuEquivalenceDto {
  /** Publicación del SKU que ML dio de baja. */
  @ApiProperty()
  @IsString()
  fromItemId: string;

  /** Variación borrada, o null si lo que cambió fue la publicación entera. */
  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @IsString()
  fromVariationId?: string;

  @ApiProperty()
  @IsString()
  toItemId: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @IsString()
  toVariationId?: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @IsString()
  @MinLength(3)
  reason?: string;
}

export class SkuEquivalenceDto {
  @ApiProperty() id: number;
  @ApiProperty() fromItemId: string;
  @ApiPropertyOptional({ type: String, nullable: true }) fromVariationId:
    string | null;
  @ApiProperty() toItemId: string;
  @ApiPropertyOptional({ type: String, nullable: true }) toVariationId:
    string | null;
  @ApiPropertyOptional({ type: String, nullable: true }) reason: string | null;
  @ApiProperty() createdAt: string;
  /** Cuántas líneas de venta pasan hoy por esta equivalencia. */
  @ApiProperty() affectedSales: number;
}
