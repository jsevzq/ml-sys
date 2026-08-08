import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class PictureDto {
  @ApiProperty({ example: '123456-MLU12345678901_012025' })
  @Expose()
  id: string;

  @ApiProperty({ example: 'https://http2.mlstatic.com/D_803910.jpg' })
  @Expose()
  secureUrl: string;
}
