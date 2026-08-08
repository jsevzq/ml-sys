import { ApiProperty } from '@nestjs/swagger';

export class MonthlySalesDto {
  @ApiProperty({ example: '2026-03', description: 'Mes en formato YYYY-MM' })
  month: string;

  @ApiProperty({ example: 12500.5 })
  revenue: number;

  @ApiProperty({ example: 9800.2 })
  net: number;

  @ApiProperty({ example: 14 })
  units: number;

  @ApiProperty({ example: 12 })
  orders: number;
}

export class TopProductDto {
  @ApiProperty({ example: 'MLU1234567890' })
  mlItemId: string;

  @ApiProperty({ example: 'Pendrive USB 3.2 Metálico' })
  title: string;

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'Null si la publicación ya no está en el catálogo',
  })
  itemId: string | null;

  @ApiProperty({ example: 71 })
  units: number;

  @ApiProperty({ example: 79304.16 })
  revenue: number;

  @ApiProperty({ example: 62943.5 })
  net: number;
}

export class OrderSummaryDto {
  @ApiProperty({
    example: 153,
    description: 'Ventas no canceladas del período',
  })
  orders: number;

  @ApiProperty({ example: 162, description: 'Unidades vendidas' })
  units: number;

  @ApiProperty({ example: 153929.02, description: 'Facturación bruta' })
  revenue: number;

  @ApiProperty({ example: 26360.5, description: 'Comisiones de Mercado Libre' })
  commissions: number;

  @ApiProperty({
    example: -2440.6,
    description: 'Balance de envíos: negativo si pagaste, positivo si cobraste',
  })
  shipping: number;

  @ApiProperty({ example: 125128.0, description: 'Lo que ML te liquidó' })
  net: number;

  @ApiProperty({
    example: 1006.07,
    description: 'Facturación promedio por venta',
  })
  averageTicket: number;

  @ApiProperty({ example: 2, description: 'Ventas canceladas del período' })
  cancelled: number;

  @ApiProperty({ type: [MonthlySalesDto] })
  byMonth: MonthlySalesDto[];

  @ApiProperty({ type: [TopProductDto] })
  topProducts: TopProductDto[];
}
