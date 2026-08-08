import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToMany,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Picture } from './picture.entity';
import { Variation } from './variation.entity';
import { AttributeOption } from './attribute-option.entity';
import { Attribute } from './attribute.entity';
import { MlUser } from '../../ml/entities/ml-user.entity';

@Entity()
export class Item {
  @PrimaryColumn()
  id: string; // MLU1234567890

  @ManyToOne(() => MlUser, { nullable: false, onDelete: 'CASCADE' })
  @Index()
  mlUser: MlUser;

  @Column()
  title: string;

  @Column()
  categoryId: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  price: number;

  @Column()
  currencyId: string; // UYU

  @Column()
  initialQuantity: number;

  @Column()
  availableQuantity: number;

  @Column()
  soldQuantity: number; // Agregado/Calculado

  @Column()
  status: string; // active, paused, etc.

  @Column({ type: 'float', nullable: true })
  health: number | null;

  @Column()
  logisticType: string; // xd_drop_off, me2...

  @Column()
  permalink: string;

  @Column()
  thumbnail: string;

  @CreateDateColumn()
  dateCreated: Date;

  @UpdateDateColumn()
  lastUpdated: Date;

  @Column({ type: 'timestamp' })
  startTime: Date;

  @Column({ type: 'timestamp' })
  stopTime: Date;

  @Column({ type: 'timestamp' })
  expirationTime: Date;

  // RELACIONES
  @ManyToMany(() => Picture)
  @JoinTable({ name: 'item_pictures' })
  pictures: Picture[];

  @ManyToMany(() => Attribute)
  @JoinTable({ name: 'item_attributes' })
  attributes: Attribute[];

  @ManyToMany(() => AttributeOption)
  @JoinTable({ name: 'item_attribute_options' })
  attributeOptions: AttributeOption[];

  @OneToMany(() => Variation, (variation) => variation.item)
  variations: Variation[];
}
