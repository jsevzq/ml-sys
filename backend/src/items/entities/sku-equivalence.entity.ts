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
 * "Esta variante vieja de Mercado Libre es la misma que esta otra."
 *
 * ML no permite renombrar una variante: hay que borrarla y crear una nueva, que
 * nace con otro id y con el contador de ventas en cero. Las ventas viejas quedan
 * apuntando a un id que ya no existe en el catálogo, y sin esta equivalencia el
 * motor de atribución no las puede casar con ningún lote. Pasó con la Celeste de
 * 0.30mm y con la Negro de la misma publicación.
 *
 * Se resuelve al leer, no al escribir: la orden conserva el id que informó ML —es
 * espejo fiel y el sync la sobrescribiría igual—, y todo lo que compara SKUs pasa
 * antes por acá.
 *
 * Es además el primer paso hacia un SKU interno propio, que es lo que hace falta
 * cuando además de variantes se republican publicaciones enteras.
 */
@Entity()
@Unique('UQ_sku_equivalence_origen', [
  'mlUser',
  'fromItemId',
  'fromVariationId',
])
export class SkuEquivalence {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => MlUser, { nullable: false, onDelete: 'CASCADE' })
  @Index()
  mlUser: MlUser;

  /** Publicación del SKU que dejó de existir. */
  @Column()
  fromItemId: string;

  /** Variación que ML borró, o null si lo que cambió fue la publicación entera. */
  @Column({ type: 'bigint', nullable: true })
  fromVariationId: string | null;

  @Column()
  toItemId: string;

  @Column({ type: 'bigint', nullable: true })
  toVariationId: string | null;

  @Column({ type: 'varchar', nullable: true })
  reason: string | null;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  createdAt: Date;
}
