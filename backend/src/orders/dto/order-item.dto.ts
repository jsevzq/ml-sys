import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Transform, Type } from 'class-transformer';
import { OrderItemType } from '../entities/order-item.entity';
import { variantLabel } from '../../items/lib/variant-label';

interface OrderItemSource {
  item?: { id?: string } | null;
  variation?: {
    id?: string;
    attributeOptions?: {
      attribute?: { name?: string | null } | null;
      valueName?: string | null;
    }[];
  } | null;
}

export class OrderItemDto {
  @ApiProperty({ example: 12 })
  @Expose()
  id: number;

  @ApiProperty({ enum: OrderItemType, example: OrderItemType.VARIATION })
  @Expose()
  type: OrderItemType;

  @ApiProperty({ example: 'MLU1234567891' })
  @Expose()
  mlItemId: string;

  @ApiPropertyOptional({ example: '111111111112' })
  @Expose()
  mlVariationId?: string;

  @ApiProperty({
    example: 'Funda Antigolpes Transparente Para Celular',
    description: 'Título al momento de la venta',
  })
  @Expose()
  title: string;

  @ApiProperty({ example: 1 })
  @Expose()
  quantity: number;

  @ApiProperty({ example: 916.96 })
  @Expose()
  @Type(() => Number)
  unitPrice: number;

  @ApiProperty({ example: 161.96, description: 'Comisión de ML por unidad' })
  @Expose()
  @Type(() => Number)
  saleFee: number;

  @ApiProperty({ example: 'UYU' })
  @Expose()
  currencyId: string;

  @ApiPropertyOptional({ example: null })
  @Expose()
  @Type(() => Number)
  baseExchangeRate?: number;

  @ApiPropertyOptional({ example: null })
  @Expose()
  baseCurrencyId?: string;

  /**
   * Si el producto sigue en el catálogo, el frontend puede enlazarlo. Cuando la
   * publicación se eliminó de ML queda en null y sólo se muestra el snapshot.
   */
  @ApiPropertyOptional({
    type: String,
    nullable: true,
    example: 'MLU1234567891',
    description: 'Null si la publicación ya no está sincronizada',
  })
  @Expose()
  @Transform(({ obj }: { obj: OrderItemSource }) => obj.item?.id ?? null, {
    toClassOnly: true,
  })
  itemId?: string | null;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    example: '111111111112',
  })
  @Expose()
  @Transform(({ obj }: { obj: OrderItemSource }) => obj.variation?.id ?? null, {
    toClassOnly: true,
  })
  variationId?: string | null;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    example: 'Color: Verde',
    description:
      'Qué variante se vendió. Null si la publicación no tiene variantes.',
  })
  @Expose()
  @Transform(
    ({ obj }: { obj: OrderItemSource }) =>
      variantLabel(obj.variation?.attributeOptions),
    { toClassOnly: true },
  )
  variantName?: string | null;
}
