import {
  Column,
  Entity,
  Index,
  ManyToOne,
  OneToMany,
  PrimaryColumn,
} from 'typeorm';
import { MlUser } from '../../ml/entities/ml-user.entity';
import { OrderItem } from './order-item.entity';
import { Shipment } from './shipment.entity';

@Entity()
export class Order {
  @PrimaryColumn({ type: 'bigint' })
  id: string;

  @ManyToOne(() => MlUser, { nullable: false, onDelete: 'CASCADE' })
  @Index()
  mlUser: MlUser;

  @Column()
  status: string;

  @Column({ type: 'timestamptz' })
  @Index()
  dateCreated: Date;

  @Column({ type: 'timestamptz', nullable: true })
  dateClosed: Date | null;

  /** Cursor del sync incremental: ML lo mueve cuando cambia el estado o hay devolución. */
  @Column({ type: 'timestamptz' })
  @Index()
  dateLastUpdated: Date;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  totalAmount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  paidAmount: number | null;

  @Column()
  currencyId: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  shippingCost: number | null;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  couponAmount: number;

  @Column({ type: 'bigint', nullable: true })
  @Index()
  packId: string | null;

  @Column({ type: 'varchar', nullable: true })
  buyerNickname: string | null;

  @ManyToOne(() => Shipment, (shipment) => shipment.orders, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @Index()
  shipment: Shipment | null;

  @OneToMany(() => OrderItem, (orderItem) => orderItem.order, { cascade: true })
  items: OrderItem[];
}
