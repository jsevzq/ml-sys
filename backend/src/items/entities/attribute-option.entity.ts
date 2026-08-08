import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Attribute } from './attribute.entity';
import { AttributeOptionDetailed } from './attribute-option-detailed.entity';

@Entity()
@Unique(['attribute', 'valueName'])
@Index(['attribute', 'valueName'])
export class AttributeOption {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  mlId: string;

  @Column()
  valueName: string; // "Verde"

  @ManyToOne(() => Attribute, (attr) => attr.options)
  attribute: Attribute; // Sigue apuntando a su "padre" (ej: "0.30" -> "Diámetro")

  // Se va a utilizar solamente si el tipo de atributo es number_unit
  @OneToOne(() => AttributeOptionDetailed)
  @JoinColumn()
  detailed: AttributeOptionDetailed;
}
