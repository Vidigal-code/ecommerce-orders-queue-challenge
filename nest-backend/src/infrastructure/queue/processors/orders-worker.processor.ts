import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import * as orderRepository from '../../../domain/repositories/order.repository';
import { Order, Priority } from '../../../domain/entities/order.entity';
import { LogsUseCase } from '../../../application/use-cases/logs.usecase';
import { AsyncLogService } from '../../../shared/logs/async-log.service';
import { MetricsService } from '../../metrics/metrics.service';
import { TimingService } from '../../../shared/timing/timing.service';
import { EventsGateway } from '../../websocket/events.gateway';

const PROCESS_CONCURRENCY = parseInt(
  process.env.ORDERS_QUEUE_CONCURRENCY || '10',
  10,
);

const BULK_UPDATE_MODE = (process.env.BULK_UPDATE_MODE || 'true') === 'true';

interface BufferedUpdate {
  order: Order;
}

interface ActiveJobTracker {
  jobId: string;
  startTime: number;
  priority: string;
  timeoutHandler: NodeJS.Timeout;
}

@Processor('orders-queue', { concurrency: PROCESS_CONCURRENCY })
@Injectable()
export class OrdersWorkerProcessor extends WorkerHost implements OnModuleInit {
  private buffer: BufferedUpdate[] = [];
  private readonly BUFFER_MAX = 100;
  private flushing = false;
  private readonly MAX_PROCESSING_TIME = 10000;
  private activeJobs: Map<string, ActiveJobTracker> = new Map();
  private readonly HEALTH_CHECK_INTERVAL = 15000;
  private healthCheckTimer: NodeJS.Timeout | null = null;
  private readonly MAX_ACTIVE_JOBS = 100;

  constructor(
    @Inject('IOrderRepository')
    private readonly orderRepo: orderRepository.IOrderRepository,
    private readonly logs: LogsUseCase,
    private readonly log: AsyncLogService,
    private readonly metrics: MetricsService,
    private readonly timing: TimingService,
    private readonly events: EventsGateway,
  ) {
    super();
  }

  async onModuleInit() {
    this.healthCheckTimer = setInterval(() => {
      this.checkActiveJobsHealth();
    }, this.HEALTH_CHECK_INTERVAL);
  }

  private checkActiveJobsHealth() {
    const now = Date.now();

    if (this.activeJobs.size > 0) {
      this.log.log(
        `[OrdersWorkerProcessor] Health check: ${this.activeJobs.size} jobs ativos em processamento`,
      );

      for (const [jobId, tracker] of this.activeJobs.entries()) {
        const processingTime = now - tracker.startTime;

        if (processingTime > this.MAX_PROCESSING_TIME * 1.5) {
          this.log.warn(
            `[OrdersWorkerProcessor] Health alert: Job ${jobId} (${tracker.priority}) está processando há ${processingTime / 1000}s, possível travamento`,
          );

          this.metrics.incProcessed(`stuck_${tracker.priority || 'unknown'}`);
        }
      }
    }

    this.metrics.setQueueMetric('activeJobsCount', this.activeJobs.size);
    this.metrics.setQueueMetric('lastHealthCheck', Date.now());
  }

  private completeJobTracking(jobId: string, success: boolean) {
    const tracker = this.activeJobs.get(jobId);
    if (tracker) {
      if (tracker.timeoutHandler) {
        clearTimeout(tracker.timeoutHandler);
      }

      this.activeJobs.delete(jobId);

      const processingTime = Date.now() - tracker.startTime;
      this.metrics.setQueueMetric(
        `processingTime_${tracker.priority || 'unknown'}`,
        processingTime,
      );

      if (processingTime > 5000) {
        this.log.log(
          `[OrdersWorkerProcessor] Job ${jobId} (${tracker.priority}) ${
            success ? 'completed' : 'failed'
          } in ${processingTime}ms`,
        );
      }
    }
  }

  async process(job: Job<Order>): Promise<any> {
    if (job.name !== 'processOrder') return;

    const order = job.data;
    const startTime = Date.now();
    const isVip = order.priority === Priority.VIP;
    const windowLabel = isVip ? 'vip_processing' : 'normal_processing';
    const HARD_TIMEOUT = isVip ? 10000 : 20000;
    let finished = false;
    const jobId = job.id || `unknown-${Date.now()}`;

    const existingWindow = this.timing.getWindow(windowLabel);
    if (!existingWindow || existingWindow.endWallClock) {
      this.timing.markStart(windowLabel);
    }

    if (this.activeJobs.size >= this.MAX_ACTIVE_JOBS) {
      await new Promise((r) => setTimeout(r, 250));
    }
    const warningTimeoutHandler = setTimeout(() => {
      this.log.warn(
        `[OrdersWorkerProcessor] Potential stuck job ${jobId} (${order.priority}) > ${this.MAX_PROCESSING_TIME}ms`,
      );
    }, this.MAX_PROCESSING_TIME);
    this.activeJobs.set(jobId, {
      jobId,
      startTime,
      priority: order.priority || 'NORMAL',
      timeoutHandler: warningTimeoutHandler,
    });

    try {
      try {
        this.logs.markStart(order.priority as Priority);
      } catch {}

      if (!isVip) {
        try {
          const totalVip = await this.orderRepo.countByPriority(Priority.VIP);
          const processedVip = await this.orderRepo.countProcessedByPriority(
            Priority.VIP,
          );
          if (processedVip < totalVip) {
            await (job as any).moveToDelayed?.(
              Date.now() + 500,
              'vip-first enforcement',
            );
            return { requeued: true };
          }
        } catch (e) {
          this.log.warn(
            '[OrdersWorkerProcessor] invariant check falhou: ' +
              (e as any)?.message,
          );
        }
      }

      const workPromise = (async () => {
        order.observacoes = isVip
          ? 'sent with priority'
          : 'processed without priority';
        order.status = 'processado';
        if (BULK_UPDATE_MODE) {
          this.buffer.push({ order });
          if (this.buffer.length >= this.BUFFER_MAX) {
            await this.flushBuffer();
          }
        } else {
          await this.persistSingle(order);
        }
        finished = true;
        return 'done';
      })();

      const timeoutPromise = new Promise<'timeout'>((resolve) =>
        setTimeout(() => resolve('timeout'), HARD_TIMEOUT),
      );
      const outcome = await Promise.race([workPromise, timeoutPromise]);

      if (outcome === 'timeout' && !finished) {
        this.log.error(
          `[OrdersWorkerProcessor] TIMEOUT (race) Job ${jobId} (${order.priority}) > ${HARD_TIMEOUT}ms – fast-complete`,
        );
        try {
          this.metrics.incProcessed(order.priority || 'NORMAL');
          this.logs.markEnd(order.priority as Priority);
        } catch {}
        return { timeout: true };
      }

      if (finished) {
        if (Math.random() < 0.01) {
          try {
            this.events.emitProgress({
              phase: 'PROCESSING',
              progress: 100,
              message: `Processed ${windowLabel} sample`,
            });
          } catch {}
        }
        return { success: true };
      }
      return { unknown: true };
    } catch (err) {
      this.log.error(
        `[OrdersWorkerProcessor] Erro processando job ${jobId}: ${(err as any)?.message}`,
      );
      throw err;
    } finally {
      clearTimeout(warningTimeoutHandler);
      this.completeJobTracking(jobId, finished);
    }
  }

  private async persistSingle(order: Order) {
    try {
      await this.orderRepo.update(order);
      this.metrics.incProcessed(order.priority || 'NORMAL');
      this.logs.markEnd(order.priority as Priority);
    } catch (err) {
      this.log.error(
        `[OrdersWorkerProcessor] Erro update pedido ${order.id}: ${
          (err as any)?.message
        }`,
      );
    }
  }

  private async flushBuffer() {
    if (this.flushing) return;
    this.flushing = true;
    const batch = this.buffer.splice(0, this.buffer.length);
    const anyRepo: any = this.orderRepo as any;
    try {
      const collection =
        anyRepo?.repo?.mongodbCollection ||
        anyRepo?.repo?.manager?.connection?.mongoManager?.collection;
      if (collection && batch.length) {
        const ops = batch.map((b: BufferedUpdate) => ({
          updateOne: {
            filter: { id: b.order.id },
            update: {
              $set: {
                observacoes: b.order.observacoes,
                status: b.order.status,
                priority: b.order.priority,
              },
            },
            upsert: true,
          },
        }));
        await collection.bulkWrite(ops, { ordered: false });

        for (const item of batch) {
          this.metrics.incProcessed(item.order.priority || 'NORMAL');
          this.logs.markEnd(item.order.priority as Priority);
        }
      } else {
        for (const item of batch) {
          await this.persistSingle(item.order);
        }
      }
    } catch (err) {
      this.log.error(
        '[OrdersWorkerProcessor] Erro flushBuffer bulk: ' +
          (err as any)?.message,
      );
      for (const item of batch) {
        await this.persistSingle(item.order);
      }
    } finally {
      this.flushing = false;
    }
  }

  async onFailed(job: Job<Order>, err: Error) {
    const jobId = job.id || `unknown-${Date.now()}`;
    const isRedisBusy = err.message.includes(
      'BUSY Redis is busy running a script',
    );

    if (isRedisBusy) {
      this.log.warn(
        `[OrdersWorkerProcessor] Redis busy error for job ${jobId}, will retry or mark as completed if appropriate`,
      );

      try {
        const order = job.data;
        if (order.status === 'processado') {
          this.metrics.incProcessed(order.priority || 'NORMAL');
          this.logs.markEnd(order.priority as Priority);
          this.completeJobTracking(jobId, true);
          return;
        }
      } catch (manualErr) {
        this.log.error(
          `[OrdersWorkerProcessor] Failed to manually complete job ${jobId}: ${(manualErr as Error).message}`,
        );
      }
    } else {
      this.log.error(
        `[OrdersWorkerProcessor] Job ${jobId} failed: ${err.message}`,
      );
    }

    this.completeJobTracking(jobId, false);
  }

  async onModuleDestroy() {
    if (this.buffer.length) {
      await this.flushBuffer();
    }

    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }

    if (this.activeJobs.size > 0) {
      this.log.warn(
        `[OrdersWorkerProcessor] ${this.activeJobs.size} jobs still active during shutdown, may need recovery on restart`,
      );

      for (const [jobId, tracker] of this.activeJobs.entries()) {
        if (tracker.timeoutHandler) {
          clearTimeout(tracker.timeoutHandler);
        }
      }

      this.activeJobs.clear();
    }
  }
}
