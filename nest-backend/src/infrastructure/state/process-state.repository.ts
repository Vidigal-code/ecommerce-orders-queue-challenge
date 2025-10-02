import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MongoRepository } from 'typeorm';
import { OptionalUnlessRequiredId } from 'mongodb';
import { ProcessStateEntity } from './process-state.entity';

@Injectable()
export class ProcessStateRepository {
  constructor(
    @InjectRepository(ProcessStateEntity)
    private readonly repo: MongoRepository<ProcessStateEntity>,
  ) {}

  async load(): Promise<ProcessStateEntity | null> {
    const doc = await this.repo.findOne({});
    return doc ?? null;
  }

  async save(state: Partial<ProcessStateEntity>): Promise<void> {
    const existing = await this.repo.findOne({});
    const payload: ProcessStateEntity = {
      phase: state.phase ?? existing?.phase ?? 'IDLE',
      aborted: state.aborted ?? existing?.aborted ?? false,
      activeGenerateJobId:
        state.activeGenerateJobId ?? existing?.activeGenerateJobId ?? null,
      totalQuantityTarget:
        state.totalQuantityTarget ?? existing?.totalQuantityTarget ?? 0,
      updatedAt: new Date(),
      _id: existing?._id,
    };
    if (existing?._id) {
      await this.repo.update(existing._id, payload);
      return;
    }

    const doc = this.repo.create(payload);
    await this.repo.insert(doc as OptionalUnlessRequiredId<ProcessStateEntity>);
  }

  async reset(): Promise<void> {
    await this.repo.deleteMany({});
  }
}
