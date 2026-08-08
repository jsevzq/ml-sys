import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { AttributeOptionDto } from './attribute-option.dto';

export class AttributeDto {
  @ApiPropertyOptional({ example: 'COLOR' })
  @Expose()
  id: string;

  @ApiProperty({ example: 'Color' })
  @Expose()
  name: string;

  @ApiProperty({ type: [AttributeOptionDto] })
  @Expose()
  @Type(() => AttributeOptionDto)
  options?: AttributeOptionDto[];
}
