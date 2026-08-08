import {
  Column,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ImportationProduct } from './importation-product.entity';
import { OrderItem } from '../../orders/entities/order-item.entity';
import { MlUser } from '../../ml/entities/ml-user.entity';

/**
 * Constancia de qué venta consumió qué lote. Es lo que permite responder "cuánto
 * queda de la importación de marzo" sin ir restando de un contador.
 *
 * La tabla se reconstruye entera con `StockAllocationService.recalculate()`, que
 * es determinístico: sincronizar las ventas de nuevo no vuelve a descontar stock,
 * porque el resultado depende sólo de los lotes cargados y de las ventas vigentes.
 */
export enum AllocationSource {
  /** Salió de una venta que tenemos con su orden y su fecha. */
  ORDER = 'order',
  /**
   * Unidad vendida antes de los 12 meses que expone la API de órdenes de ML. Se
   * deduce de `soldQuantity` del catálogo menos lo que sí tenemos, y se ubica justo
   * antes de la venta más vieja conocida: la fecha exacta no se puede saber.
   */
  HISTORICAL = 'historical',
}

@Entity()
export class SaleAllocation {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => MlUser, { nullable: false, onDelete: 'CASCADE' })
  @Index()
  mlUser: MlUser;

  /**
   * La línea de venta que consumió el lote. Va en null cuando la unidad se vendió
   * antes del historial que expone Mercado Libre (ver `source`).
   */
  @ManyToOne(() => OrderItem, { nullable: true, onDelete: 'CASCADE' })
  @Index()
  orderItem: OrderItem | null;

  @Column({
    type: 'enum',
    enum: AllocationSource,
    default: AllocationSource.ORDER,
  })
  source: AllocationSource;

  /** Qué se vendió, también para las históricas que no tienen orden. */
  @Column()
  @Index()
  mlItemId: string;

  @Column({ type: 'bigint', nullable: true })
  mlVariationId: string | null;

  @ManyToOne(() => ImportationProduct, { nullable: false, onDelete: 'CASCADE' })
  @Index()
  importationProduct: ImportationProduct;

  @Column({ type: 'integer' })
  quantity: number;

  /** Fecha de la venta: es la que ordena el FIFO y la que arma la línea de tiempo del lote. */
  @Column({ type: 'timestamptz' })
  @Index()
  soldAt: Date;
}
