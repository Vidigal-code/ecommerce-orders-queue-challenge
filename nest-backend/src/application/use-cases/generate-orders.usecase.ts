import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue, Job } from 'bullmq';
import { AsyncLogService } from '../../shared/logs/async-log.service';
import { OrdersProcessStateService } from '../../infrastructure/queue/services/orders-process-state.service';
import { LogsUseCase } from './logs.usecase';
import { OrdersQueueService } from '../../infrastructure/queue/services/orders-queue.service';
import { ProcessStateRepository } from '../../infrastructure/state/process-state.repository';
import { Phase } from '../../infrastructure/queue/types/phase.types';
import { ExecuteOptions } from './interfaces/generate-interface.orders.usecase';

const INTERMEDIATE_PHASES: Phase[] = [
  'GENERATING',
  'ENQUEUE_VIP',
  'WAITING_VIP_DRAIN',
  'ENQUEUE_NORMAL',
  'WAITING_NORMAL_DRAIN',
];

@Injectable()
export class GenerateOrdersUseCase {
  private readonly MAX_ORDERS: number;

  constructor(
    @InjectQueue('orders-queue')
    private readonly ordersQueue: Queue,
    private readonly log: AsyncLogService,
    private readonly state: OrdersProcessStateService,
    private readonly logs: LogsUseCase,
    private readonly queueService: OrdersQueueService,
    private readonly processStateRepo: ProcessStateRepository,
  ) {
    this.MAX_ORDERS = parseInt(process.env.MAX_ORDERS || '1500000', 10);
  }

  private async ensureQueueReady(timeoutMs = 5000): Promise<void> {
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(
        () =>
          reject(new Error('Queue readiness timeout (Redis indisponível?)')),
        timeoutMs,
      ),
    );
    await Promise.race([this.ordersQueue.waitUntilReady(), timeout]);
  }

  private async ensureWorkerConnected(timeoutMs = 3000) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      try {
        const workers = await this.ordersQueue.getWorkers();
        if (workers && workers.length > 0) return;
      } catch {}
      await new Promise((r) => setTimeout(r, 250));
    }
    this.log.warn(
      '[GenerateOrdersUseCase] Nenhum worker conectado detectado no timeout. Job ficará esperando.',
    );
  }

  private async snapshotGenerateJobs(): Promise<Job[]> {
    return await this.ordersQueue.getJobs(
      ['waiting', 'active', 'delayed'],
      0,
      100,
    );
  }

  private async isStale(
    phase: Phase,
    staleThresholdMs: number,
  ): Promise<{ stale: boolean; reason?: string }> {
    if (!INTERMEDIATE_PHASES.includes(phase)) {
      return { stale: false };
    }
    const persisted = await this.processStateRepo.load();
    let lastUpdate = 0;
    const updatedAt = persisted?.updatedAt;
    if (updatedAt instanceof Date) {
      lastUpdate = updatedAt.getTime();
    } else if (typeof updatedAt === 'string' || typeof updatedAt === 'number') {
      const parsed = new Date(updatedAt);
      if (!Number.isNaN(parsed.getTime())) {
        lastUpdate = parsed.getTime();
      }
    }
    const age = Date.now() - lastUpdate;

    const counts = await this.queueService.getCounts();
    const pending =
      (counts.waiting || 0) +
      (counts.active || 0) +
      (counts.delayed || 0) +
      (counts['waiting-children'] || 0);

    if (pending > 0) {
      return { stale: false };
    }

    const genJobs = await this.snapshotGenerateJobs();
    const hasGen = genJobs.some((j) => j.name === 'generateOrders');

    if (hasGen) {
      return { stale: false };
    }

    if (age > staleThresholdMs) {
      return {
        stale: true,
        reason: `phase=${phase} sem jobs e ageMs=${age}`,
      };
    }
    return { stale: false };
  }

  private async forceResetState(label: string) {
    this.log.warn(
      `[GenerateOrdersUseCase] FORCE RESET (${label}) → estado redefinido para IDLE.`,
    );
    this.state.resetAll();
    await this.processStateRepo.save({
      phase: 'IDLE',
      activeGenerateJobId: null,
      aborted: false,
    });
    this.logs.resetLogs();
  }

  async execute(
    quantity: number,
    opts?: ExecuteOptions,
  ): Promise<{
    message: string;
    phase: Phase;
    forced?: boolean;
    staleRecovered?: boolean;
    staleReason?: string;
  }> {
    const {
      force = false,
      autoForceIfStale = true,
      returnOnActive = true,
      staleThresholdMs = 15_000,
    } = opts || {};

    let phase = this.state.getPhase();

    if (phase === 'ABORTED') {
      await this.forceResetState('ABORTED->IDLE');
      phase = 'IDLE';
    }

    if (force) {
      await this.forceResetState('force=true');
      phase = 'IDLE';
    } else {
      const { stale, reason } = await this.isStale(phase, staleThresholdMs);
      if (stale && autoForceIfStale) {
        await this.forceResetState('auto-stale');
        phase = 'IDLE';
        this.log.log(
          `[GenerateOrdersUseCase] Recuperação automática de stale aplicada: ${reason}`,
        );
        return {
          message:
            'Estado anterior estava travado (stale) e foi recuperado. Execute novamente (ou esta chamada já pode ter enfileirado).',
          phase: 'IDLE',
          staleRecovered: true,
          staleReason: reason,
        };
      } else if (stale && !autoForceIfStale) {
        return {
          message: `Processo em fase intermediária possivelmente travado (stale). Use force=true para reiniciar. (${reason})`,
          phase,
          staleRecovered: false,
          staleReason: reason,
        };
      }
    }

    if (INTERMEDIATE_PHASES.includes(phase)) {
      if (returnOnActive) {
        return {
          message: `Processamento já em andamento (phase=${phase}).`,
          phase,
        };
      }
      const msg = `[GenerateOrdersUseCase] Já existe um processamento em andamento (phase=${phase}). Use /pedidos/cancel ou force=true.`;
      this.log.warn(msg);
      throw new Error(msg);
    }

    const activeId = (this.state as any).getActiveGenerateJobId?.();
    if (phase === 'IDLE' && activeId) {
      const existing = await this.ordersQueue
        .getJob(activeId)
        .catch(() => null);
      if (existing) {
        return {
          message: `Uma geração já foi enfileirada (jobId=${activeId}) e aguarda transição de fase. Evitado enqueue duplicado.`,
          phase,
        };
      }
    }

    if (!Number.isFinite(quantity) || quantity <= 0) {
      const msg = `[GenerateOrdersUseCase] Parâmetro inválido 'quantity': ${quantity}`;
      this.log.error(msg);
      throw new Error(msg);
    }
    if (quantity > this.MAX_ORDERS) {
      const msg = `[GenerateOrdersUseCase] quantity excede limite (${this.MAX_ORDERS})`;
      this.log.error(msg);
      throw new Error(msg);
    }

    this.state.setAborted(false);
    await this.processStateRepo.save({ aborted: false });

    this.logs.resetLogs();
    this.logs.setTotalQuantityTarget(quantity);

    this.log.log(
      `[GenerateOrdersUseCase] Iniciando job generateOrders quantity=${quantity} (basePhase=${phase})` +
        (force ? ' (FORCE)' : ''),
    );

    await this.ensureQueueReady();
    await this.ensureWorkerConnected();

    const jobId = 'generate-active';
    const existingJob = await this.ordersQueue.getJob(jobId).catch(() => null);
    if (existingJob) {
      const state = await existingJob.getState().catch(() => 'unknown');
      this.log.warn(
        `[GenerateOrdersUseCase] Job de geração já existe (jobId=${jobId}, state=${state}) – não enfileirando duplicado`,
      );
      return {
        message: `Processo já em andamento (jobId=${jobId}, state=${state})`,
        phase: this.state.getPhase(),
      };
    }
    await this.ordersQueue.add(
      'generateOrders',
      { quantity },
      {
        jobId,
        priority: 1,
        removeOnComplete: false,
        removeOnFail: false,
        attempts: 1,
      },
    );

    this.state.setActiveGenerateJobId(jobId);
    await this.processStateRepo.save({
      activeGenerateJobId: jobId,
    });

    const job = await this.ordersQueue.getJob(jobId);
    if (!job) {
      this.log.warn(
        `[GenerateOrdersUseCase] Job não encontrado após add (jobId=${jobId}). Verifique Redis.`,
      );
    } else {
      const jState = await job.getState().catch(() => 'unknown');
      this.log.log(
        `[GenerateOrdersUseCase] Job enfileirado (jobId=${jobId}) stateInicial=${jState}`,
      );
    }

    return {
      message: force
        ? 'Processo (force) iniciado.'
        : 'Processo iniciado: geração + processamento (VIP -> NORMAL).',
      phase: this.state.getPhase(),
      forced: force,
    };
  }
}
