import {
  PrimaryGeneratedColumn,
  Column,
  Entity,
  Index,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { ImportationProduct } from './importation-product.entity';
import { AdditionalCost } from './additional-cost.entity';
import { MlUser } from '../../ml/entities/ml-user.entity';

@Entity()
export class Importation {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => MlUser, { nullable: false, onDelete: 'CASCADE' })
  @Index()
  mlUser: MlUser;

  @Column({ type: 'timestamp' })
  orderDate: Date;

  @Column({ type: 'timestamp' })
  arrivalDate: Date;

  /**
   * Lo que se esperaba que dejara el lote entero, calculado el día que se persistió
   * con los precios de lista de ese momento. Es una foto, no un indicador vivo: no
   * se recalcula cuando cambian los precios, porque su gracia es poder comparar
   * después lo que pasó contra lo que se esperaba.
   */
  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
  expectedNetUYU: number;

  // Las líneas no existen sin su importación: se guardan y se borran con ella.
  @OneToMany(() => ImportationProduct, (product) => product.importation, {
    cascade: true,
  })
  products: ImportationProduct[];

  @OneToMany(() => AdditionalCost, (cost) => cost.importation, {
    cascade: true,
  })
  additionalCosts: AdditionalCost[];
}
