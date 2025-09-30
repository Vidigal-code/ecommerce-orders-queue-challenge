import { Entity, ObjectIdColumn, Column, ObjectId, Index } from 'typeorm';
import { Tier, Priority } from '../../../../domain/entities/order.entity';

@Index(['id'], { unique: true })
@Index(['priority'])
@Index(['priority', 'status'])
@Index(['createdAt'])
@Entity('orders')
export class OrderTypeOrmEntity {
  @ObjectIdColumn()
  _id: ObjectId;

  @Column()
  id: string;

  @Column()
  cliente: string;

  @Column('double')
  valor: number;

  @Column()
  tier: Tier;

  @Column()
  observacoes: string;

  @Column()
  priority: Priority;

  @Column()
  status: string;

  @Column()
  createdAt: Date;
}
