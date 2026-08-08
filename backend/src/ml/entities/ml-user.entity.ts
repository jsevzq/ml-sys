import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
export class MlUser {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  userId: string;

  @Column({ unique: true })
  mlUserId: string;

  @Column({ nullable: true })
  nickname: string;

  @Column({ nullable: true })
  email: string;

  @Column({ nullable: true })
  fullName: string;

  @Column()
  accessToken: string;

  @Column()
  refreshToken: string;

  @Column()
  expiresAt: Date;

  /**
   * Hasta dónde llegó la última sincronización de ventas. Se compara contra
   * `order.date_last_updated` de ML y no contra la fecha de creación: es lo único que
   * trae de vuelta una orden vieja que cambió de estado o que se devolvió.
   */
  @Column({ type: 'timestamptz', nullable: true })
  ordersSyncedUntil: Date | null;

  /**
   * Cuándo Mercado Libre dejó de aceptar el refresh token.
   *
   * Marcarla evita reintentar el refresh en cada request y permite avisar en la
   * interfaz, en vez de dejar que el usuario se entere al chocar contra un 403.
   * Se limpia al volver a vincular.
   */
  @Column({ type: 'timestamptz', nullable: true })
  disconnectedAt: Date | null;

  @UpdateDateColumn()
  updatedAt: Date;
}
