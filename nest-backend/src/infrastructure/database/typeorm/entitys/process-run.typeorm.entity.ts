import { Entity, ObjectIdColumn, Column } from 'typeorm';
import { ProcessRun } from '../../../../domain/entities/process-run.entity';
import { ObjectId } from 'mongodb';

@Entity('process_runs')
export class ProcessRunTypeOrmEntity implements ProcessRun {
  @ObjectIdColumn()
  _id?: ObjectId;

  @Column()
  id?: string;

  @Column()
  runId?: string;

  @Column()
  generationTimeMs?: number;

  @Column()
  processingTimeVIPMs?: number;

  @Column()
  processingTimeNormalMs?: number;

  @Column()
  startVIP?: Date | null;

  @Column()
  endVIP?: Date | null;

  @Column()
  startNormal?: Date | null;

  @Column()
  endNormal?: Date | null;

  @Column()
  totalProcessedVIP?: number;

  @Column()
  totalProcessedNormal?: number;

  @Column()
  totalTimeMs?: number;

  @Column()
  enqueueVipTimeMs?: number;

  @Column()
  enqueueNormalTimeMs?: number;

  @Column()
  createdAt?: Date;
}
