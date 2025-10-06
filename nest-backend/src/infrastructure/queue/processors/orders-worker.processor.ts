import { Process, Processor } from '@nestjs/bull';
import type { Job } from 'bull';
import { Inject, Injectable } from '@nestjs/common';
import * as orderRepository from '../../../domain/repositories/order.repository';
import { Order, Priority } from '../../../domain/entities/order.entity';
import { LogsUseCase } from '../../../application/use-cases/logs.usecase';
import { LogService } from '../../../shared/logs/log.service';
import { EventsGateway } from '../../websocket/events.gateway';

const PROCESS_CONCURRENCY = parseInt(
  process.env.ORDERS_QUEUE_CONCURRENCY || '25',
  10,
);

@Processor('orders-queue')
@Injectable()
export class OrdersWorkerProcessor {
  private processedCount = 0;
  private readonly EMIT_STATUS_EVERY = 100; // Emit status every 100 orders to reduce WebSocket overhead

  constructor(
    @Inject('IOrderRepository')
    private readonly orderRepo: orderRepository.IOrderRepository,
    private readonly logsUseCase: LogsUseCase,
    private readonly logService: LogService,
    private readonly eventsGateway: EventsGateway,
  ) {}

  @Process('processOrder')
  async handleProcessOrder(job: Job<Order>) {

    const order: Order = job.data;

    if (order.priority === Priority.VIP) {
      order.observacoes = 'enviado com prioridade';
    } else {
      order.observacoes = 'processado sem prioridade';
    }
    order.status = 'processado';

    try {
      await this.orderRepo.update(order);
    } catch (err) {
      this.logService.error(
        `[OrdersWorkerProcessor] Erro ao atualizar pedido ${order.id}: ` +
          (err as any)?.message,
      );
      throw err;
    }

    // Emit real-time status update via WebSocket less frequently
    this.processedCount++;
    if (this.processedCount % this.EMIT_STATUS_EVERY === 0) {
      try {
        const processLog = await this.logsUseCase.getProcessLog();
        const statusUpdate = {
          generationTimeMs: processLog?.generationTimeMs ?? 0,
          enqueueVipTimeMs: processLog?.enqueueVipTimeMs ?? 0,
          enqueueNormalTimeMs: processLog?.enqueueNormalTimeMs ?? 0,
          processing: {
            vip: {
              start: processLog?.startVIP ? processLog.startVIP.toISOString() : null,
              end: processLog?.endVIP ? processLog.endVIP.toISOString() : null,
              timeMs: processLog?.processingTimeVIPMs ?? 0,
              count: processLog?.totalProcessedVIP ?? 0,
            },
            normal: {
              start: processLog?.startNormal ? processLog.startNormal.toISOString() : null,
              end: processLog?.endNormal ? processLog.endNormal.toISOString() : null,
              timeMs: processLog?.processingTimeNormalMs ?? 0,
              count: processLog?.totalProcessedNormal ?? 0,
            },
          },
          totalTimeMs: processLog?.totalTimeMs ?? 0,
          counts: {
            vip: processLog?.totalProcessedVIP ?? 0,
            normal: processLog?.totalProcessedNormal ?? 0,
          },
          phase: processLog?.phase ?? 'PROCESSING',
          throughput: processLog?.throughput ?? { vip: 0, normal: 0, overall: 0 },
          eta: processLog?.eta ? {
            estimatedMs: processLog.eta.estimatedMs || null,
            progressPercent: processLog.eta.progressPercent,
          } : { estimatedMs: null, progressPercent: 0 },
          progress: {
            target: processLog?.target ?? 0,
            generated: processLog?.generated ?? 0,
            processedTotal: (processLog?.totalProcessedVIP ?? 0) + (processLog?.totalProcessedNormal ?? 0),
          },
        };

        this.eventsGateway.emitStatus(statusUpdate);
      } catch (err) {
        this.logService.warn(
          '[OrdersWorkerProcessor] Erro ao emitir status: ' +
            (err as any)?.message,
        );
      }
    }
  }
}
