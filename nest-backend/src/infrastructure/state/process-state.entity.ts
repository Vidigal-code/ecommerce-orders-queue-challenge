import { Entity, ObjectIdColumn, Column } from 'typeorm';
import { ObjectId } from 'mongodb';

@Entity('process_state')
export class ProcessStateEntity {
  @ObjectIdColumn()
  _id?: ObjectId;

  @Column()
  phase: string;

  @Column()
  aborted: boolean;

  @Column()
  activeGenerateJobId?: string | null;

  @Column()
  totalQuantityTarget?: number;

  @Column()
  updatedAt: Date;
}
