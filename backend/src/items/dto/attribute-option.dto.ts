import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Transform, Type } from 'class-transformer';
import { AttributeOptionDetailedDto } from './attribute-option-detailed.dto';

interface AttributeOptionSource {
  attributeId?: string;
  attributeName?: string;
  attribute?: { id?: string; name?: string };
}

export class AttributeOptionDto {
  @ApiProperty({ example: '52014' })
  @Expose()
  id: number;

  @ApiPropertyOptional({ example: '40234' })
  @Expose()
  mlId?: string;

  @ApiProperty({ example: 'Verde' })
  @Expose()
  valueName: string;

  @ApiProperty({ example: 'COLOR' })
  @Expose()
  @Transform(
    ({ obj }: { obj: AttributeOptionSource }) =>
      obj.attributeId ?? obj.attribute?.id,
    { toClassOnly: true },
  )
  attributeId: string;

  @ApiProperty({ example: 'Color' })
  @Expose()
  @Transform(
    ({ obj }: { obj: AttributeOptionSource }) =>
      obj.attributeName ?? obj.attribute?.name,
    { toClassOnly: true },
  )
  attributeName: string;

  @ApiPropertyOptional({ type: AttributeOptionDetailedDto })
  @Expose()
  @Type(() => AttributeOptionDetailedDto)
  detailed?: AttributeOptionDetailedDto;
}
