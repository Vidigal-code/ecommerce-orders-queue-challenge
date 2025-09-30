import { Injectable, Inject } from '@nestjs/common';
import { OrdersGenerationProcessor } from '../../infrastructure/queue/processors/orders-generation.processor';
import { OrdersQueueService } from '../../infrastructure/queue/services/orders-queue.service';
import * as orderRepository from '../../domain/repositories/order.repository';
import { LogsUseCase } from './logs.usecase';
import { OrdersProcessStateService } from '../../infrastructure/queue/services/orders-process-state.service';
import {
  CancelOptions,
  CancelResult,
} from './interfaces/cancel-interface.process.usecase';

@Injectable()
export class CancelProcessUseCase {
  constructor(
    private readonly generationProcessor: OrdersGenerationProcessor,
    private readonly state: OrdersProcessStateService,
    private readonly queueService: OrdersQueueService,
    @Inject('IOrderRepository')
    private readonly orderRepo: orderRepository.IOrderRepository,
    private readonly logsUseCase: LogsUseCase,
  ) {}

  async execute(options?: CancelOptions): Promise<CancelResult> {
    const {
      purge = true,
      resetLogs = false,
      removePending = true,
      waitTimeoutMs = 10_000,
      pollIntervalMs = 500,
    } = options || {};

    if (!this.state.hasActiveGeneration() && !this.state.isAborting()) {
      return {
        aborted: false,
        queuePaused: false,
        message: 'Nenhuma geração ativa para cancelar.',
      };
    }

    this.generationProcessor.abort();

    let queuePaused = false;
    try {
      await this.queueService.pauseQueue(true);
      queuePaused = true;
    } catch {
      queuePaused = false;
    }

    if (purge) {
      try {
        await this.queueService.purgeAll();
      } catch {}
    }

    let removedPending = 0;
    if (removePending) {
      try {
        removedPending = await this.orderRepo.deletePending();
      } catch {}
    }

    if (resetLogs) {
      try {
        this.logsUseCase.resetLogs();
      } catch {}
    }

    const startWait = Date.now();
    while (
      this.state.hasActiveGeneration() &&
      Date.now() - startWait < waitTimeoutMs
    ) {
      await new Promise((r) => setTimeout(r, pollIntervalMs));
    }
    const waitedForStopMs = Date.now() - startWait;
    const stillActive = this.state.hasActiveGeneration();

    return {
      aborted: true,
      queuePaused,
      removedPending,
      purged: purge,
      logsReset: resetLogs,
      waitedForStopMs,
      stillActive,
      message: stillActive
        ? 'Abort solicitado; tempo limite ao aguardar finalização (alguns jobs podem continuar brevemente).'
        : 'Processo abortado e limpo com sucesso (fase = ABORTED).',
    };
  }
}
