import { Column, Entity, Index, PrimaryGeneratedColumn, Unique } from 'typeorm';

@Unique(['number', 'unit', 'attributeId'])
@Index(['number', 'unit', 'attributeId'])
@Entity()
export class AttributeOptionDetailed {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'float' })
  number: number;

  @Column()
  unit: string;

  @Column()
  attributeId: string;
}
