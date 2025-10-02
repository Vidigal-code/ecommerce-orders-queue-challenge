import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import { OrdersQueueService } from '../services/orders-queue.service';
import { AsyncLogService } from '../../../shared/logs/async-log.service';

@Injectable()
export class QueueShutdownProvider implements OnApplicationShutdown {
  constructor(
    private readonly queue: OrdersQueueService,
    private readonly logs: AsyncLogService,
  ) {}

  async onApplicationShutdown() {
    try {
      await this.queue.closeQueue();
    } catch {}
    try {
      await this.logs.flush();
    } catch {}
  }
}
