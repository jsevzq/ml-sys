import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Transform, Type } from 'class-transformer';
import { AttributeOptionDto } from './attribute-option.dto';
import { PictureDto } from './picture.dto';
import { variantLabel } from '../lib/variant-label';

interface VariationSource {
  attributeOptions?: {
    attribute?: { name?: string | null } | null;
    valueName?: string | null;
  }[];
}

export class VariationDto {
  @ApiProperty({ example: '111111111111' })
  @Expose()
  id: string;

  @ApiProperty({ example: 916.96 })
  @Expose()
  @Type(() => Number)
  price: number;

  @ApiProperty({ example: 1 })
  @Expose()
  availableQuantity: number;

  @ApiProperty({ example: 46 })
  @Expose()
  soldQuantity: number;

  @ApiProperty({ type: [AttributeOptionDto] })
  @Expose()
  @Type(() => AttributeOptionDto)
  attributeOptions: AttributeOptionDto[];

  @ApiProperty({ type: [PictureDto] })
  @Expose()
  @Type(() => PictureDto)
  pictures: PictureDto[];

  /** "Color: Verde · Talle: M". Es lo que hay que mostrar en cualquier selector. */
  @ApiPropertyOptional({
    type: String,
    nullable: true,
    example: 'Color: Verde',
  })
  @Expose()
  @Transform(
    ({ obj }: { obj: VariationSource }) => variantLabel(obj.attributeOptions),
    { toClassOnly: true },
  )
  variantName?: string | null;
}
