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
import { ProcessStateRepository } from '../../infrastructure/state/process-state.repository';

@Injectable()
export class CancelProcessUseCase {
  constructor(
    private readonly generationProcessor: OrdersGenerationProcessor,
    private readonly state: OrdersProcessStateService,
    private readonly queueService: OrdersQueueService,
    @Inject('IOrderRepository')
    private readonly orderRepo: orderRepository.IOrderRepository,
    private readonly logsUseCase: LogsUseCase,
    private readonly processStateRepo: ProcessStateRepository,
  ) {}

  async execute(options?: CancelOptions): Promise<CancelResult> {
    const {
      purge = true,
      resetLogs = false,
      removePending = true,
      waitTimeoutMs = 10_000,
      pollIntervalMs = 500,
      resetPhaseToIdle = true,
    } = options || {};

    if (!this.state.hasActiveGeneration() && !this.state.isAborting()) {
      return {
        aborted: false,
        queuePaused: false,
        message: 'Nenhuma geração ativa para cancelar.',
      };
    }

    this.state.setAborted(true);
    this.state.setPhase('ABORTED');
    this.state.setActiveGenerateJobId(null);
    if (typeof (this.generationProcessor as any)?.abort === 'function') {
      try {
        (this.generationProcessor as any).abort();
      } catch {}
    }

    await this.processStateRepo.save({
      aborted: true,
      phase: 'ABORTED',
      activeGenerateJobId: null,
    });

    let queuePaused = false;
    try {
      await this.queueService.pauseQueue();
      queuePaused = true;
    } catch {
      queuePaused = false;
    }

    const startWaitAbort = Date.now();
    while (
      this.state.hasActiveGeneration() &&
      Date.now() - startWaitAbort < waitTimeoutMs
    ) {
      await new Promise((r) => setTimeout(r, pollIntervalMs));
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

    const stillActive = this.state.hasActiveGeneration();
    const waitedForStopMs = Date.now() - startWaitAbort;

    if (!stillActive) {
      try {
        await this.logsUseCase.persistRun();
      } catch {}
    }

    if (!stillActive && resetPhaseToIdle) {
      this.state.resetAll();
      await this.processStateRepo.save({
        phase: 'IDLE',
        aborted: false,
        activeGenerateJobId: null,
      });
    }

    try {
      await this.queueService.resumeQueue();
    } catch {}

    return {
      aborted: true,
      queuePaused,
      removedPending,
      purged: purge,
      logsReset: resetLogs,
      waitedForStopMs,
      stillActive,
      message: stillActive
        ? 'Abort solicitado; tempo limite ao aguardar finalização.'
        : resetPhaseToIdle
          ? 'Processo abortado, limpo e fase liberada (IDLE).'
          : 'Processo abortado (fase ABORTED).',
    };
  }
}
