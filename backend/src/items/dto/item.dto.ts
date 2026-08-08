import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { PictureDto } from './picture.dto';
import { AttributeOptionDto } from './attribute-option.dto';
import { VariationDto } from './variation.dto';
import { AttributeDto } from './attribute.dto';

export class ItemDto {
  @ApiProperty({ example: 'MLU1234567890' })
  @Expose()
  id: string;

  @ApiProperty({ example: 'Pendrive USB 3.2 Metálico - 64 GB' })
  @Expose()
  title: string;

  @ApiProperty({ example: 'MLU12345' })
  @Expose()
  categoryId: string;

  @ApiProperty({ example: 916.96 })
  @Expose()
  @Type(() => Number)
  price: number;

  @ApiProperty({ example: 'UYU' })
  @Expose()
  currencyId: string;

  @ApiProperty({ example: 78 })
  @Expose()
  initialQuantity: number;

  @ApiProperty({ example: 6 })
  @Expose()
  availableQuantity: number;

  @ApiProperty({ example: 72 })
  @Expose()
  soldQuantity: number;

  @ApiProperty({ example: 'active' })
  @Expose()
  status: string;

  @ApiPropertyOptional({ example: 0.88 })
  @Expose()
  health?: number;

  @ApiProperty({ example: 'xd_drop_off' })
  @Expose()
  logisticType: string;

  @ApiProperty()
  @Expose()
  permalink: string;

  @ApiProperty()
  @Expose()
  thumbnail: string;

  @ApiProperty()
  @Expose()
  dateCreated: Date;

  @ApiProperty()
  @Expose()
  lastUpdated: Date;

  @ApiProperty()
  @Expose()
  startTime: Date;

  @ApiProperty()
  @Expose()
  stopTime: Date;

  @ApiProperty()
  @Expose()
  expirationTime: Date;

  @ApiProperty({ type: [PictureDto] })
  @Expose()
  @Type(() => PictureDto)
  pictures: PictureDto[];

  @ApiProperty({ type: [AttributeDto] })
  @Expose()
  @Type(() => AttributeDto)
  attributes: AttributeDto[];

  @ApiProperty({ type: [AttributeOptionDto] })
  @Expose()
  @Type(() => AttributeOptionDto)
  attributeOptions: AttributeOptionDto[];

  @ApiProperty({ type: [VariationDto] })
  @Expose()
  @Type(() => VariationDto)
  variations: VariationDto[];
}
