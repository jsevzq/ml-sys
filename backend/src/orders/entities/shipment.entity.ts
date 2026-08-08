import {
  Column,
  Entity,
  Index,
  ManyToOne,
  OneToMany,
  PrimaryColumn,
} from 'typeorm';
import { MlUser } from '../../ml/entities/ml-user.entity';
import { Order } from './order.entity';

/**
 * Envío de Mercado Libre. Es del **pack**, no de la orden: un carrito con varios
 * productos genera una orden por producto y todas comparten este envío. Por eso vive
 * en su propia tabla y las órdenes le apuntan, en vez de repetir el costo en cada una.
 */
@Entity()
export class Shipment {
  @PrimaryColumn({ type: 'bigint' })
  id: string;

  @ManyToOne(() => MlUser, { nullable: false, onDelete: 'CASCADE' })
  @Index()
  mlUser: MlUser;

  @Column({ type: 'bigint', nullable: true })
  @Index()
  packId: string | null;

  @Column({ type: 'varchar', nullable: true })
  status: string | null;

  @Column({ type: 'varchar', nullable: true })
  substatus: string | null;

  @Column({ type: 'varchar', nullable: true })
  logisticMode: string | null;

  @Column({ type: 'varchar', nullable: true })
  logisticType: string | null;

  /** Lo que pagó el vendedor. Es el costo real que se descuenta de la ganancia. */
  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  senderCost: number | null;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  receiverCost: number | null;

  /**
   * Bonificación que ML le acredita al vendedor sobre el costo del envío. En Flex con
   * envío gratis es lo único que aparece en la liquidación de la venta.
   */
  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  senderDiscount: number | null;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  grossAmount: number | null;

  @Column({ type: 'varchar', nullable: true })
  trackingNumber: string | null;

  @Column({ type: 'varchar', nullable: true })
  trackingMethod: string | null;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  declaredValue: number | null;

  @Column({ type: 'timestamptz', nullable: true })
  dateCreated: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  lastUpdated: Date | null;

  @OneToMany(() => Order, (order) => order.shipment)
  orders: Order[];
}
