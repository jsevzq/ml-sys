import { ApiProperty } from '@nestjs/swagger';

export class AllocationSummaryDto {
  @ApiProperty({
    example: 128,
    description: 'Asignaciones de venta a lote creadas',
  })
  allocations: number;

  @ApiProperty({
    example: 140,
    description: 'Unidades vendidas que salieron de un lote',
  })
  allocatedUnits: number;

  @ApiProperty({
    example: 22,
    description:
      'Unidades vendidas sin lote: stock anterior al sistema o importación sin cargar',
  })
  unitsWithoutLot: number;

  @ApiProperty({
    example: 72,
    description:
      'Unidades vendidas antes de los 12 meses que expone la API de órdenes de ML. Se deducen del soldQuantity del catálogo y se descuentan de los lotes más viejos.',
  })
  historicalUnits: number;
}
