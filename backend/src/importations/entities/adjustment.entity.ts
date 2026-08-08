import {
  Check,
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ImportationProduct } from './importation-product.entity';
import { OrderItem } from '../../orders/entities/order-item.entity';
import { Item } from '../../items/entities/item.entity';
import { Variation } from '../../items/entities/variation.entity';
import { MlUser } from '../../ml/entities/ml-user.entity';

export enum AdjustmentKind {
  /** La unidad salió del lote sin venta: rotura, consumo propio, regalo. */
  DESTRUCTION = 'destruction',
  /** Llegó un producto distinto al comprado y se lo pasa a vender como el que es. */
  MUTATION = 'mutation',
  /** La venta de un producto se despachó con la unidad de otro. */
  SWAP = 'swap',
}

/**
 * Información de modificación que se le adjunta a un lote o a una venta.
 *
 * **El dato original nunca se toca.** Ni las líneas de la importación, que quedan
 * como se cargaron, ni las órdenes, que son espejo fiel de ML y el sync
 * sobrescribiría igual. La subsanación es una capa que el motor de atribución
 * superpone cada vez que recalcula, así que sobrevive a cualquier resincronización
 * en vez de desaparecer con ella.
 *
 * Las de importación son **rígidas**: apuntan a una línea concreta de un lote
 * concreto. Si vino una unidad fallada, vino en ese lote y no en otro. La línea
 * elegible no se restringe a las que hoy tienen saldo: si las ventas ya agotaron
 * ese lote, la subsanación lo consume igual en su fecha y la venta desplazada cae
 * al lote siguiente. Por eso llevan fecha.
 */
@Entity()
@Check(
  'CHK_adjustment_source',
  `("importationProductId" IS NOT NULL)::int + ("orderItemId" IS NOT NULL)::int = 1`,
)
export class Adjustment {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => MlUser, { nullable: false, onDelete: 'CASCADE' })
  @Index()
  mlUser: MlUser;

  @Column({ type: 'enum', enum: AdjustmentKind })
  type: AdjustmentKind;

  /** Por qué pasó, en palabras del usuario. Es el valor de todo esto. */
  @Column({ type: 'text' })
  reason: string;

  @Column({ type: 'integer', default: 1 })
  quantity: number;

  /**
   * Cuándo ocurrió. Ordena el evento en la línea de tiempo del FIFO. En los swaps
   * no se pide: la fecha es la de la venta.
   */
  @Column({ type: 'timestamptz', nullable: true })
  occurredAt: Date | null;

  /** Línea del lote que pierde la unidad. Destrucción y mutación. */
  @ManyToOne(() => ImportationProduct, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @Index()
  importationProduct: ImportationProduct | null;

  /** Venta que se despachó con otro producto. Sólo swap. */
  @ManyToOne(() => OrderItem, { nullable: true, onDelete: 'CASCADE' })
  @Index()
  orderItem: OrderItem | null;

  /**
   * En qué se convirtió la unidad (mutación) o qué se despachó realmente (swap).
   * Vacío en las destrucciones, donde la unidad no reaparece en ningún lado.
   */
  @ManyToOne(() => Item, { nullable: true })
  @JoinColumn()
  targetItem: Item | null;

  @ManyToOne(() => Variation, { nullable: true })
  @JoinColumn()
  targetVariation: Variation | null;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  createdAt: Date;
}
