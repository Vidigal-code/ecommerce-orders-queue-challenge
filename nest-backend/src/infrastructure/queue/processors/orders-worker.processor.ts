import { Processor, Process } from '@nestjs/bull';
import type { Job } from 'bull';
import { Inject, Injectable } from '@nestjs/common';
import * as orderRepository from '../../../domain/repositories/order.repository';
import { Order, Priority } from '../../../domain/entities/order.entity';
import { LogsUseCase } from '../../../application/use-cases/logs.usecase';
import { LogService } from '../../../shared/logs/log.service';

const PROCESS_CONCURRENCY = parseInt(
  process.env.ORDERS_QUEUE_CONCURRENCY || '25',
  10,
);

@Processor('orders-queue')
@Injectable()
export class OrdersWorkerProcessor {
  constructor(
    @Inject('IOrderRepository')
    private readonly orderRepo: orderRepository.IOrderRepository,
    private readonly logsUseCase: LogsUseCase,
    private readonly logService: LogService,
  ) {}

  @Process({ name: 'processOrder', concurrency: PROCESS_CONCURRENCY })
  async handleProcessOrder(job: Job<Order>) {
    const order: Order = job.data;

    try {
      this.logsUseCase.markStart(order.priority as Priority);
    } catch (err) {
      this.logService.warn(
        '[OrdersWorkerProcessor][processOrder] Erro markStart logs: ' +
          (err as any)?.message,
      );
    }
    if (order.priority === Priority.VIP) {
      order.observacoes = 'enviado com prioridade';
    } else {
      order.observacoes = 'processado sem prioridade';
    }
    order.status = 'processado';

    try {
      await this.orderRepo.update(order);
      try {
        this.logsUseCase.markEnd(order.priority as Priority);
      } catch (err) {
        this.logService.warn(
          '[OrdersWorkerProcessor][processOrder] Erro markEnd logs: ' +
            (err as any)?.message,
        );
      }
    } catch (err) {
      this.logService.error(
        `[OrdersWorkerProcessor][processOrder] Erro ao atualizar pedido ${order.id}: ${
          (err as any)?.message
        }`,
      );
    }
  }
}
