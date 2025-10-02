import { ProcessRun } from '../entities/process-run.entity';

export interface IProcessRunRepository {
  save(run: ProcessRun): Promise<void>;
  findLatest(): Promise<ProcessRun | null>;
  findRecent(limit: number): Promise<ProcessRun[]>;
  resetAll(): Promise<void>;
}
