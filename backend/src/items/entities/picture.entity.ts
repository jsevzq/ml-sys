import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity()
export class Picture {
  @PrimaryColumn()
  id: string;

  @Column()
  secureUrl: string;
}
