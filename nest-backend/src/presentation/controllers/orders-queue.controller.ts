import { Controller, Post, Get, Query, DefaultValuePipe } from '@nestjs/common';
import { OrdersQueueService } from '../../infrastructure/queue/services/orders-queue.service';

@Controller('pedidos/queue')
export class OrdersQueueController {
  constructor(private readonly queueService: OrdersQueueService) {}

  @Post('pause')
  async pauseQueue(
    @Query('global', new DefaultValuePipe('true')) global: string,
  ) {
    await this.queueService.pauseQueue(global === 'true');
    return { paused: true, global: global === 'true' };
  }

  @Post('resume')
  async resumeQueue(
    @Query('global', new DefaultValuePipe('true')) global: string,
  ) {
    await this.queueService.resumeQueue(global === 'true');
    return { resumed: true, global: global === 'true' };
  }

  @Post('clean')
  async cleanQueue(
    @Query('state', new DefaultValuePipe('wait')) state: string,
    @Query('grace', new DefaultValuePipe('0')) grace: string,
  ) {
    const allowed = ['wait', 'active', 'delayed', 'completed', 'failed'];
    if (!allowed.includes(state)) {
      return { error: 'state deve ser wait|active|delayed|completed|failed' };
    }
    const removed = await this.queueService.clean(
      state as any,
      parseInt(grace, 10) || 0,
    );
    return { removed, state };
  }

  @Post('close')
  async closeQueue() {
    await this.queueService.closeQueue();
    return { closed: true };
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
        .filter(Boolean) as any;

      const startNum = parseInt(start, 10);
      const endNum = parseInt(end, 10);

      const jobs = await this.queueService.getJobs(typesArr, startNum, endNum);

      const safeJobs = jobs.filter((j) => !!j);

      const includePayload = includeData === 'true';

      const result = await Promise.all(
        safeJobs.map(async (j) => {
          let state: string;
          try {
            state =
              (await (j as any).getState?.()) ||
              (j.finishedOn ? 'finished' : 'pending');
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
    } catch (err: any) {
      return {
        error: 'Falha ao listar jobs',
        message: err?.message || String(err),
      };
    }
  }
}
