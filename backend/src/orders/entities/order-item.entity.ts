import {
  Column,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Order } from './order.entity';
import { Item } from '../../items/entities/item.entity';
import { Variation } from '../../items/entities/variation.entity';

export enum OrderItemType {
  ITEM = 'item',
  VARIATION = 'variation',
}

@Entity()
export class OrderItem {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Order, (order) => order.items, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @Index()
  order: Order;

  /** `variation` si ML mandó `variation_id`; si no, la venta es de la publicación entera. */
  @Column({ type: 'enum', enum: OrderItemType })
  type: OrderItemType;

  /**
   * Ids tal como los mandó ML. Son la fuente de la verdad: una venta puede ser de una
   * publicación que después se eliminó, y en ese caso las relaciones de abajo quedan
   * nulas pero la venta se guarda igual.
   */
  @Column()
  @Index()
  mlItemId: string;

  @Column({ type: 'bigint', nullable: true })
  @Index()
  mlVariationId: string | null;

  @ManyToOne(() => Item, { nullable: true, onDelete: 'SET NULL' })
  item: Item | null;

  @ManyToOne(() => Variation, { nullable: true, onDelete: 'SET NULL' })
  variation: Variation | null;

  /** Snapshot: es lo único que queda para mostrar una publicación ya eliminada. */
  @Column()
  title: string;

  @Column()
  quantity: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  unitPrice: number;

  /** Comisión de ML **por unidad**: el total de la línea es saleFee × quantity. */
  @Column({ type: 'decimal', precision: 12, scale: 2 })
  saleFee: number;

  @Column()
  currencyId: string;

  @Column({ type: 'decimal', precision: 18, scale: 6, nullable: true })
  baseExchangeRate: number | null;

  @Column({ type: 'varchar', nullable: true })
  baseCurrencyId: string | null;
}
