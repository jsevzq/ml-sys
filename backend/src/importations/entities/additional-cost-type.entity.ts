import {
  Column,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { MlUser } from '../../ml/entities/ml-user.entity';

/**
 * Catálogo propio de conceptos de costo: "Régimen simplificado", "Envío",
 * "Despachante", "Seguro". Cada cuenta arma el suyo.
 */
@Entity()
@Unique(['mlUser', 'name'])
export class AdditionalCostType {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => MlUser, { nullable: false, onDelete: 'CASCADE' })
  @Index()
  mlUser: MlUser;

  @Column()
  name: string;
}
