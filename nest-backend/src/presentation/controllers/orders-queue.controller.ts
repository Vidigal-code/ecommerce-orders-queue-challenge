import { Controller, Post, Get, Query, DefaultValuePipe } from '@nestjs/common';
import { OrdersQueueService } from '../../infrastructure/queue/services/orders-queue.service';

type CleanableState = Parameters<OrdersQueueService['clean']>[0];
type JobListTypes = Parameters<OrdersQueueService['getJobs']>[0];

@Controller('pedidos/queue')
export class OrdersQueueController {
  constructor(private readonly queueService: OrdersQueueService) {}

  @Post('pause')
  async pauseQueue() {
    await this.queueService.pauseQueue();
    return { paused: true };
  }

  @Post('resume')
  async resumeQueue() {
    await this.queueService.resumeQueue();
    return { resumed: true };
  }

  @Post('clean')
  async cleanQueue(
    @Query('state', new DefaultValuePipe('completed')) state: string,
    @Query('grace', new DefaultValuePipe('0')) grace: string,
    @Query('limit', new DefaultValuePipe('1000')) limit: string,
  ) {
    const allowed: CleanableState[] = [
      'completed',
      'wait',
      'failed',
      'delayed',
      'waiting-children',
      'paused',
    ];
    const castState = state as CleanableState;
    if (!allowed.includes(castState)) {
      return { error: 'state inválido; use: ' + allowed.join('|') };
    }
    const removed = await this.queueService.clean(
      castState,
      parseInt(grace, 10) || 0,
      parseInt(limit, 10) || 1000,
    );
    return { removed, state: castState };
  }

  @Post('purge')
  async purge(
    @Query('obliterate', new DefaultValuePipe('false')) obliterate: string,
  ) {
    await this.queueService.purgeAll({ obliterate: obliterate === 'true' });
    return { purged: true, obliterate: obliterate === 'true' };
  }

  @Post('close')
  async closeQueue() {
    await this.queueService.closeQueue();
    return { closed: true };
  }

  @Post('retry-failed')
  async retryFailedJobs() {
    const failedJobs = await this.queueService.getJobs(['failed'], 0, 1000);
    let retried = 0;

    for (const job of failedJobs) {
      try {
        await job.retry();
        retried++;
      } catch (err: any) {
        console.warn(`Failed to retry job ${job.id}: ${err?.message || err}`);
      }
    }

    return { retried };
  }

  @Post('recover-stuck')
  async recoverStuckJobs(
    @Query('maxJobs', new DefaultValuePipe('100')) maxJobs: string,
  ) {
    const maxJobsNum = parseInt(maxJobs, 10) || 100;
    const recovered =
      await this.queueService.recoverStuckActiveJobs(maxJobsNum);
    return {
      recovered,
      message: `Recuperados ${recovered} jobs ativos que estavam travados`,
    };
  }

  @Get('status')
  async queueStatus() {
    return this.queueService.getCounts();
  }

  @Get('jobs')
  async queueJobs(
    @Query('types', new DefaultValuePipe('waiting')) types: string,
    @Query('start', new DefaultValuePipe('0')) start: string,
    @Query('end', new DefaultValuePipe('50')) end: string,
    @Query('includeData', new DefaultValuePipe('true')) includeData: string,
  ) {
    try {
      const typesArr = types
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean) as string[];

      const typedTypes = typesArr as JobListTypes;

      const startNum = parseInt(start, 10);
      const endNum = parseInt(end, 10);

      const jobs = await this.queueService.getJobs(
        typedTypes,
        startNum,
        endNum,
      );
      const safeJobs = jobs.filter((j) => !!j);
      const includePayload = includeData === 'true';

      const result = await Promise.all(
        safeJobs.map(async (j) => {
          let state: string;
          try {
            state =
              (await j.getState()) || (j.finishedOn ? 'finished' : 'pending');
          } catch {
            state = j.finishedOn ? 'finished' : 'pending';
          }
          return {
            id: j.id,
            name: j.name,
            state,
            timestamp: j.timestamp,
            processedOn: j.processedOn,
            finishedOn: j.finishedOn,
            attemptsMade: j.attemptsMade,
            data: includePayload ? j.data : undefined,
          };
        }),
      );

      return {
        total: result.length,
        types: typesArr,
        range: { start: startNum, end: endNum },
        jobs: result,
      };
    } catch (err: unknown) {
      return {
        error: 'Falha ao listar jobs',
        message: err instanceof Error ? err.message : String(err),
      };
    }
  }
}
