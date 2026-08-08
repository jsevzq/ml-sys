import {
  Check,
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Importation } from './importation.entity';
import { Adjustment } from './adjustment.entity';
import { Item } from '../../items/entities/item.entity';
import { Variation } from '../../items/entities/variation.entity';

// Una línea de importación apunta a un item simple o a una variación, nunca a ambos ni a ninguno.
@Check(
  'CHK_importation_product_item_xor_variation',
  `("itemId" IS NOT NULL)::int + ("variationId" IS NOT NULL)::int = 1`,
)
@Entity()
export class ImportationProduct {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'integer' })
  quantity: number;

  @Column({ type: 'integer', default: 0 })
  quantitySold: number;

  /**
   * Unidades que salieron de esta línea sin venderse, por una subsanación. Copia
   * materializada, como `quantitySold`: se reescribe entera en cada recálculo.
   */
  @Column({ type: 'integer', default: 0 })
  quantityAdjusted: number;

  /**
   * La línea no se compró: la generó una mutación, y representa una unidad de otra
   * línea del mismo lote que resultó ser este producto. Queda afuera del costo de
   * la importación —hereda el costo unitario de su origen— para que el invertido
   * total no cambie: no se compró nada nuevo, sólo se redistribuyó entre SKUs.
   */
  @ManyToOne(() => Adjustment, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn()
  @Index()
  generatedBy: Adjustment | null;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  price: number;

  /**
   * Precio de lista del producto en Mercado Libre cuando se persistió la importación.
   * Es el insumo del valor esperado del lote, y se guarda por línea para que el
   * número se pueda explicar producto por producto.
   *
   * Null cuando no se pudo saber: el producto se despublicó, o la línea la generó
   * una mutación posterior a la carga.
   */
  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  expectedUnitPriceUYU: number | null;

  @Column()
  currency: string;

  @Column({ type: 'decimal', precision: 10, scale: 4 })
  exchangeToUYURate: number;

  @ManyToOne(() => Importation, (importation) => importation.products, {
    onDelete: 'CASCADE',
  })
  importation: Importation;

  @ManyToOne(() => Item, { nullable: true })
  @JoinColumn()
  item: Item | null;

  @ManyToOne(() => Variation, { nullable: true })
  @JoinColumn()
  variation: Variation | null;
}
