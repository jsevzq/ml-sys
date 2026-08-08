import { ApiProperty } from '@nestjs/swagger';

export class MlSyncResultDto {
  @ApiProperty({
    example: 22,
    description: 'Publicaciones encontradas en la cuenta de ML',
  })
  found: number;

  @ApiProperty({
    example: 22,
    description: 'Publicaciones guardadas correctamente',
  })
  saved: number;

  @ApiProperty({
    type: [String],
    example: [],
    description: 'IDs que ML no devolvió con código 200',
  })
  notSaved: string[];
}
