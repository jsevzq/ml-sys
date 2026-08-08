import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class AttributeOptionDetailedDto {
  @ApiProperty({ example: '52014' })
  @Expose()
  id: number;

  @ApiProperty({ example: 0.5 })
  @Expose()
  number: number;

  @ApiProperty({ example: 'mm' })
  @Expose()
  unit: string;
}
