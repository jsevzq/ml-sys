import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class OrderSyncResultDto {
  @ApiProperty({
    example: 155,
    description: 'Ventas que devolvió Mercado Libre',
  })
  found: number;

  @ApiProperty({ example: 155, description: 'Ventas guardadas' })
  saved: number;

  @ApiProperty({ example: 148, description: 'Envíos con su costo actualizado' })
  shipments: number;

  @ApiProperty({
    type: [String],
    example: [],
    description: 'Ids que no se pudieron guardar',
  })
  notSaved: string[];

  @ApiPropertyOptional({
    description:
      'Hasta dónde quedó sincronizado. La próxima corrida arranca de acá.',
  })
  syncedUntil?: Date;
}
