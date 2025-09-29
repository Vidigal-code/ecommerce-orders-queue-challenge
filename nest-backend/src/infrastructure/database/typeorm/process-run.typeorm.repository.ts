import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MongoRepository } from 'typeorm';
import { ProcessRunTypeOrmEntity } from './process-run.typeorm.entity';
import { ProcessRun } from '../../../domain/entities/process-run.entity';
import type { IProcessRunRepository } from '../../../domain/repositories/process-run.repository';

@Injectable()
export class ProcessRunTypeOrmRepository implements IProcessRunRepository {
    constructor(
        @InjectRepository(ProcessRunTypeOrmEntity)
        private readonly repo: MongoRepository<ProcessRunTypeOrmEntity>,
    ) {}

    async save(run: ProcessRun): Promise<void> {
        const toSave = {
            ...run,
            createdAt: run.createdAt ?? new Date(),
        };
        await this.repo.insertOne(toSave as any);
    }

    async findLatest(): Promise<ProcessRun | null> {
        const docs = await this.repo.find({ order: { createdAt: 'DESC' }, take: 1 });
        if (!docs || docs.length === 0) return null;
        return docs[0] as unknown as ProcessRun;
    }

    async resetAll(): Promise<void> {
        await this.repo.deleteMany({});
    }
}