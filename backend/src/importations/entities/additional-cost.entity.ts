import {
  Column,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Importation } from './importation.entity';
import { AdditionalCostType } from './additional-cost-type.entity';

export enum AdditionalCostKind {
  /** Un monto en su moneda: flete, despachante, seguro. */
  FIXED = 'fixed',
  /** Un porcentaje sobre el costo de la mercadería: régimen simplificado, aranceles. */
  PERCENTAGE = 'percentage',
}

/**
 * Costo de la importación que no es el precio de la mercadería. Se prorratea entre
 * las líneas por valor, y es lo que convierte el precio de compra en costo real
 * puesto en depósito.
 *
 * El diagrama original modelaba fijo y porcentual como dos subclases; acá se resuelve
 * con un discriminador porque la única diferencia es qué significa `amount`.
 */
@Entity()
export class AdditionalCost {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Importation, (importation) => importation.additionalCosts, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @Index()
  importation: Importation;

  @ManyToOne(() => AdditionalCostType, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @Index()
  type: AdditionalCostType;

  @Column({ type: 'enum', enum: AdditionalCostKind })
  kind: AdditionalCostKind;

  /** Monto en `currency` si es fijo; porcentaje sobre la mercadería si es porcentual. */
  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @Column({ type: 'varchar', nullable: true })
  currency: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 4, nullable: true })
  exchangeToUYURate: number | null;

  @Column({ type: 'timestamptz', nullable: true })
  paidAt: Date | null;
}
