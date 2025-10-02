import { Controller, Get } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { OrdersProcessStateService } from '../../infrastructure/queue/services/orders-process-state.service';
import { ProcessStateRepository } from '../../infrastructure/state/process-state.repository';

@Controller('diagnostics')
export class DiagnosticsController {
  constructor(
    @InjectQueue('orders-queue')
    private readonly queue: Queue,
    private readonly mem: OrdersProcessStateService,
    private readonly repo: ProcessStateRepository,
  ) {}

  @Get('queue')
  async queueDiag() {
    const counts = await this.queue.getJobCounts(
      'waiting',
      'active',
      'completed',
      'failed',
      'delayed',
      'paused',
    );
    const jobs = await this.queue.getJobs(
      ['waiting', 'active', 'failed', 'completed', 'delayed'],
      0,
      50,
    );
    return {
      memoryPhase: this.mem.getPhase(),
      hasActiveGeneration: this.mem.hasActiveGeneration(),
      aborting: this.mem.isAborting(),
      persisted: await this.repo.load(),
      counts,
      sampleJobs: await Promise.all(
        jobs.map(async (j) => ({
          id: j.id,
          name: j.name,
          state: await j.getState().catch(() => 'unknown'),
          attemptsMade: j.attemptsMade,
          failedReason: (j as any)?.failedReason,
          finishedOn: j.finishedOn,
        })),
      ),
    };
  }
}
