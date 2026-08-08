import {
  Column,
  Entity,
  JoinTable,
  ManyToMany,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { Item } from './item.entity';
import { AttributeOption } from './attribute-option.entity';
import { Picture } from './picture.entity';

@Entity()
export class Variation {
  @PrimaryColumn({ type: 'bigint' })
  id: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  price: number;

  @Column()
  availableQuantity: number;

  @Column()
  soldQuantity: number;

  @ManyToOne(() => Item, (item) => item.variations)
  item: Item;

  @ManyToMany(() => AttributeOption)
  @JoinTable({ name: 'variation_attribute_options' })
  attributeOptions: AttributeOption[];

  @ManyToMany(() => Picture)
  @JoinTable({ name: 'variation_pictures' })
  pictures: Picture[];
}
