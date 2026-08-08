import { Column, Entity, OneToMany, PrimaryColumn } from 'typeorm';
import { AttributeOption } from './attribute-option.entity';

@Entity()
export class Attribute {
  @PrimaryColumn()
  id: string;

  @Column()
  name: string; // "Marca", "Color", "Material"

  @OneToMany(() => AttributeOption, (opt) => opt.attribute)
  options: AttributeOption[];
}
