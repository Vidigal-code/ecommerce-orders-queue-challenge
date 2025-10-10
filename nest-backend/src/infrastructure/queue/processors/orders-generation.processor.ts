import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Inject } from '@nestjs/common';
import { LogsUseCase } from '../../../application/use-cases/logs.usecase';
import { OrdersProcessStateService } from '../services/orders-process-state.service';
import { OrdersQueueService } from '../services/orders-queue.service';
import { ProcessStateRepository } from '../../state/process-state.repository';
import { Priority, Tier, Order } from '../../../domain/entities/order.entity';
import * as orderRepository from '../../../domain/repositories/order.repository';
import { AsyncLogService } from '../../../shared/logs/async-log.service';
import { MetricsService } from '../../metrics/metrics.service';
import { Phase } from '../types/phase.types';
import { TimingService } from '../../../shared/timing/timing.service';
import { EventsGateway } from '../../websocket/events.gateway';

@Processor('orders-queue')
@Injectable()
export class OrdersGenerationProcessor extends WorkerHost {
  private aborted = false;

  constructor(
    private readonly logs: LogsUseCase,
    private readonly state: OrdersProcessStateService,
    private readonly queue: OrdersQueueService,
    private readonly processStateRepo: ProcessStateRepository,
    @Inject('IOrderRepository')
    private readonly orderRepo: orderRepository.IOrderRepository,
    private readonly log: AsyncLogService,
    private readonly metrics: MetricsService,
    private readonly timing: TimingService,
    private readonly events: EventsGateway,
  ) {
    super();
  }

  abort() {
    this.aborted = true;
  }

  private async updatePhase(
    phase: Phase,
    extra?: Partial<{
      activeGenerateJobId: string | null;
      aborted: boolean;
      totalQuantityTarget: number;
    }>,
  ) {
    this.state.setPhase(phase);
    if (extra?.activeGenerateJobId !== undefined) {
      this.state.setActiveGenerateJobId(extra.activeGenerateJobId);
    }
    if (extra?.aborted !== undefined) {
      this.state.setAborted(extra.aborted);
    }
    const activeGenerateJobId =
      extra?.activeGenerateJobId ?? this.state.getActiveGenerateJobId();
    await this.processStateRepo.save({
      phase,
      activeGenerateJobId,
      aborted: extra?.aborted,
      totalQuantityTarget: extra?.totalQuantityTarget,
    });
    this.logs.setPhase(phase);

    try {
      this.events?.emitStatus?.({
        phase,
        target: extra?.totalQuantityTarget,
        message: `Phase changed to ${phase}`,
      });
    } catch (e) {}
  }

  private ensureNotAborted(stage: string) {
    if (this.aborted || this.state.isAborting()) {
      throw new Error(`Abortado durante ${stage}`);
    }
  }

  private async generateOrders(total: number) {
    const chunkSize = parseInt(
      process.env.GENERATION_CHUNK_SIZE || '25000',
      10,
    );
    const t0 = Date.now();
    let generated = 0;

    const distribution: Array<{ tier: Tier; prob: number }> = [
      { tier: Tier.DIAMOND, prob: 0.05 },
      { tier: Tier.GOLD, prob: 0.15 },
      { tier: Tier.SILVER, prob: 0.3 },
      { tier: Tier.BRONZE, prob: 0.5 },
    ];
    const cumulative = distribution.reduce<{ tier: Tier; c: number }[]>(
      (acc, cur) => {
        const prev = acc.length ? acc[acc.length - 1].c : 0;
        acc.push({ tier: cur.tier, c: prev + cur.prob });
        return acc;
      },
      [],
    );

    const pickTier = () => {
      const r = Math.random();
      return cumulative.find((x) => r <= x.c)?.tier || Tier.BRONZE;
    };

    while (generated < total) {
      this.ensureNotAborted('geração');
      const remain = total - generated;
      const size = Math.min(chunkSize, remain);
      const chunk: Order[] = [];

      for (let i = 0; i < size; i++) {
        const tier = pickTier();
        const priority = tier === Tier.DIAMOND ? Priority.VIP : Priority.NORMAL;
        const order: Order = {
          id: `ord-${generated + i}-${Date.now().toString(36)}-${Math.random()
            .toString(36)
            .slice(2, 8)}`,
          cliente: `cliente-${Math.floor(Math.random() * 1_000_000)}`,
          valor: parseFloat((Math.random() * 1500 + 10).toFixed(2)),
          tier,
          observacoes: 'gerado',
          priority,
          status: 'pendente',
          createdAt: new Date(),
        };
        chunk.push(order);
      }

      await this.orderRepo.bulkSave(chunk);
      generated += size;

      this.logs.incrementGenerated(size);
      this.metrics.incGenerated(size);

      if (generated % (chunkSize * 5) === 0 || generated === total) {
        this.log.log(
          `[OrdersGenerationProcessor] Gerados ${generated}/${total} (${(
            (generated / total) *
            100
          ).toFixed(2)}%)`,
        );

        try {
          this.events?.emitProgress?.({
            phase: 'GENERATING',
            progress: (generated / total) * 100,
            current: generated,
            total: total,
            message: `Generated ${generated}/${total} orders`,
          });
        } catch (e) {}
      }
    }

    const totalMs = Date.now() - t0;
    this.logs.setGenerationTime(totalMs);
    this.log.log(
      `[OrdersGenerationProcessor] Geração concluída em ${totalMs} ms (${generated} pedidos).`,
    );
  }

  private async enqueuePriority(priority: Priority, label: string) {
    const batchEnqueueSize = parseInt(
      (priority === Priority.VIP
        ? process.env.GENERATION_CHUNK_SIZE
        : process.env.NORMAL_ENQUEUE_BATCH_SIZE) || '25000',
      10,
    );
    const t0 = Date.now();
    let totalEnqueued = 0;
    const iterator = this.orderRepo.iterateByPriority
      ? this.orderRepo.iterateByPriority(priority, batchEnqueueSize)
      : null;

    // Backpressure thresholds to avoid overfilling Redis
    const MAX_QUEUED = parseInt(
      (priority === Priority.VIP
        ? process.env.MAX_QUEUED_VIP
        : process.env.MAX_QUEUED_NORMAL) || '250000',
      10,
    );
    const LOW_WATERMARK = Math.floor(MAX_QUEUED * 0.6);

    if (!iterator) {
      const all = await this.orderRepo.findByPriority(priority);
      for (let i = 0; i < all.length; i += batchEnqueueSize) {
        this.ensureNotAborted(`enqueue ${label} (fallback)`);
        const slice = all.slice(i, i + batchEnqueueSize);
        await this.queue.addBulkOrdersToQueue(slice);
        totalEnqueued += slice.length;

        // Throttle if too many jobs are pending in Redis
        try {
          const counts = await this.queue.getCounts();
          const pending = (counts.waiting || 0) + (counts.delayed || 0);
          if (pending > MAX_QUEUED) {
            this.log.warn(
              `[OrdersGenerationProcessor] Backpressure: pending=${pending} > MAX_QUEUED=${MAX_QUEUED}. Aguardando baixar para ${LOW_WATERMARK}...`,
            );
            while (true) {
              this.ensureNotAborted(`throttle ${label}`);
              const c = await this.queue.getCounts();
              const p = (c.waiting || 0) + (c.delayed || 0);
              if (p <= LOW_WATERMARK) break;
              await new Promise((r) => setTimeout(r, 2000));
            }
          }
        } catch {}
      }
    } else {
      for await (const batch of iterator) {
        this.ensureNotAborted(`enqueue ${label}`);
        await this.queue.addBulkOrdersToQueue(batch);
        totalEnqueued += batch.length;
        if (totalEnqueued % (batchEnqueueSize * 5) === 0) {
          this.log.log(
            `[OrdersGenerationProcessor] Enfileirados ${totalEnqueued} ${label}`,
          );

          try {
            this.events?.emitProgress?.({
              phase:
                priority === Priority.VIP ? 'ENQUEUE_VIP' : 'ENQUEUE_NORMAL',
              progress: 0,
              current: totalEnqueued,
              message: `Enqueued ${totalEnqueued} ${label} orders`,
            });
          } catch (e) {}
        }

        // Throttle if too many jobs are pending in Redis
        try {
          const counts = await this.queue.getCounts();
          const pending = (counts.waiting || 0) + (counts.delayed || 0);
          if (pending > MAX_QUEUED) {
            this.log.warn(
              `[OrdersGenerationProcessor] Backpressure: pending=${pending} > MAX_QUEUED=${MAX_QUEUED}. Aguardando baixar para ${LOW_WATERMARK}...`,
            );
            while (true) {
              this.ensureNotAborted(`throttle ${label}`);
              const c = await this.queue.getCounts();
              const p = (c.waiting || 0) + (c.delayed || 0);
              if (p <= LOW_WATERMARK) break;
              await new Promise((r) => setTimeout(r, 2000));
            }
          }
        } catch {}
      }
    }

    const elapsed = Date.now() - t0;
    this.log.log(
      `[OrdersGenerationProcessor] Enfileiramento ${label} concluído. total=${totalEnqueued} em ${elapsed} ms`,
    );
    return elapsed;
  }

  private async waitQueueDrain(
    phase: string,
    context?: { activeJobId?: string | number },
  ) {
    this.log.log(
      `[OrdersGenerationProcessor] Aguardando drain fila fase=${phase}...`,
    );

    const isVipPhase = phase === 'VIP';
    const maxRetries = isVipPhase ? 5 : 3;
    let retryCount = 0;

    while (retryCount < maxRetries) {
      try {
        const timeoutMs = isVipPhase ? 1000 * 60 * 30 : 1000 * 60 * 60;
        const stuckThresholdMs = isVipPhase ? 180_000 : 120_000;

        await this.queue.waitForEmpty(1500, timeoutMs, {
          label: phase,
          stuckThresholdMs,
          ignoreActiveJobIds: context?.activeJobId
            ? [String(context.activeJobId)]
            : undefined,
          ignoreActiveJobNames: ['generateOrders'],
        });

        if (isVipPhase) {
          await this.verifyVipCompletion();
        }

        this.log.log(
          `[OrdersGenerationProcessor] Drain fila fase=${phase} concluído com sucesso`,
        );
        return;
      } catch (err: any) {
        retryCount++;
        this.log.warn(
          `[OrdersGenerationProcessor] Tentativa ${retryCount}/${maxRetries} falhou para drain ${phase}: ${
            err?.message || err
          }`,
        );

        if (retryCount >= maxRetries) {
          this.log.warn(
            `[OrdersGenerationProcessor] Todas as tentativas de drain ${phase} falharam. Tentando recuperação final...`,
          );

          try {
            const recovered = await this.queue.recoverStuckActiveJobs(1000);
            this.log.log(
              `[OrdersGenerationProcessor] Recuperação final: ${recovered} jobs recuperados`,
            );
            await new Promise((resolve) => setTimeout(resolve, 5000));
            if (isVipPhase) {
              const vipRemaining = await this.countRemainingVipJobs();
              if (vipRemaining === 0) {
                this.log.log(
                  `[OrdersGenerationProcessor] Verificação final: nenhum job VIP restante`,
                );
                return;
              } else {
                this.log.warn(
                  `[OrdersGenerationProcessor] Ainda restam ${vipRemaining} jobs VIP após recuperação`,
                );
              }
            }
          } catch (recoveryErr: any) {
            this.log.error(
              `[OrdersGenerationProcessor] Falha na recuperação final: ${recoveryErr?.message}`,
            );
          }

          throw new Error(
            `Não foi possível completar o drain da fila ${phase} após ${maxRetries} tentativas e recuperação final`,
          );
        }
        await new Promise((resolve) => setTimeout(resolve, 10000));
      }
    }
  }

  private async verifyVipCompletion(): Promise<void> {
    const counts = await this.queue.getCounts();
    const activeJobs = await this.queue.getJobs(['active'], 0, 100);
    const vipActiveJobs = activeJobs.filter(
      (job) => job.data?.priority === 'VIP',
    );
    if (vipActiveJobs.length > 0) {
      throw new Error(
        `Verificação falhou: ${vipActiveJobs.length} jobs VIP ainda ativos`,
      );
    }
    const totalVipCount = await this.orderRepo.countByPriority(Priority.VIP);
    const processedVipCount = await this.orderRepo.countProcessedByPriority(
      Priority.VIP,
    );
    if (processedVipCount < totalVipCount) {
      const unprocessedCount = totalVipCount - processedVipCount;
      throw new Error(
        `Verificação falhou: ${unprocessedCount} pedidos VIP ainda não processados no banco`,
      );
    }
    this.log.log(
      '[OrdersGenerationProcessor] Verificação VIP: todos os pedidos VIP foram processados',
    );
  }

  private async countRemainingVipJobs(): Promise<number> {
    try {
      const activeJobs = await this.queue.getJobs(
        ['active', 'waiting', 'delayed'],
        0,
        1000,
      );
      return activeJobs.filter((job) => job.data?.priority === 'VIP').length;
    } catch (err) {
      this.log.warn(`Erro ao contar jobs VIP restantes: ${err}`);
      return 0;
    }
  }

  private async finalizeSuccess() {
    await this.updatePhase('DONE', { activeGenerateJobId: null });
    this.state.setActiveGenerateJobId(null);
    try {
      await this.logs.persistRun();
    } catch {}
    this.log.log('[OrdersGenerationProcessor] Processo concluído (DONE).');
  }

  private async finalizeAbort() {
    await this.updatePhase('ABORTED', {
      activeGenerateJobId: null,
      aborted: true,
    });
    try {
      await this.logs.persistRun();
    } catch {}
    this.log.warn('[OrdersGenerationProcessor] Processo abortado.');
  }

  private async finalizeError(e: any) {
    await this.updatePhase('ERROR', { activeGenerateJobId: null });
    try {
      await this.logs.persistRun();
    } catch {}
    this.log.error(
      `[OrdersGenerationProcessor] Processo terminou em ERROR: ${
        e?.message || e
      }`,
    );
  }

  async process(job: Job<any>): Promise<any> {
    if (job.name !== 'generateOrders') return;
    this.log.log(
      `[OrdersGenerationProcessor] process() recebido job generateOrders id=${job.id} data=${JSON.stringify(job.data)}`,
    );
    const quantity = job.data.quantity as number;

    this.aborted = false;
    this.state.setAborted(false);

    await this.updatePhase('GENERATING', {
      activeGenerateJobId: job.id?.toString() || 'generate',
      totalQuantityTarget: quantity,
    });

    this.timing.markStart('total');
    this.timing.markStart('generation');

    try {
      await this.generateOrders(quantity);
      this.timing.markEnd('generation');
      this.ensureNotAborted('pós-geração');

      await this.updatePhase('ENQUEUE_VIP');
      this.timing.markStart('enqueue_vip');
      const vipEnqueueMs = await this.enqueuePriority(Priority.VIP, 'VIP');
      this.logs.setEnqueueVipTime(vipEnqueueMs);
      this.state.setEnqueueVipTime(vipEnqueueMs);
      this.timing.markEnd('enqueue_vip');

      await this.updatePhase('WAITING_VIP_DRAIN');
      this.timing.markStart('wait_vip_drain');
      this.ensureNotAborted('espera drain VIP');
      await this.waitQueueDrain('VIP', { activeJobId: job.id ?? undefined });
      this.ensureNotAborted('após drain VIP');
      this.timing.markEnd('wait_vip_drain');

      await this.updatePhase('ENQUEUE_NORMAL');
      this.timing.markStart('enqueue_normal');
      const normalEnqueueMs = await this.enqueuePriority(
        Priority.NORMAL,
        'NORMAL',
      );
      this.logs.setEnqueueNormalTime(normalEnqueueMs);
      this.state.setEnqueueNormalTime(normalEnqueueMs);
      this.timing.markEnd('enqueue_normal');

      await this.updatePhase('WAITING_NORMAL_DRAIN');
      this.timing.markStart('wait_normal_drain');
      this.ensureNotAborted('espera drain NORMAL');
      await this.waitQueueDrain('NORMAL', { activeJobId: job.id ?? undefined });
      this.timing.markEnd('wait_normal_drain');

      if (this.aborted || this.state.isAborting()) {
        await this.finalizeAbort();
        this.timing.markEnd('total');
        this.aborted = false;
        return { aborted: true };
      }
      await this.finalizeSuccess();
      this.aborted = false;
      this.timing.markEnd('total');
      return { done: true };
    } catch (e: any) {
      if (this.aborted || this.state.isAborting()) {
        await this.finalizeAbort();
        this.timing.markEnd('total');
        this.aborted = false;
        return { aborted: true, error: e?.message };
      }
      await this.finalizeError(e);
      this.aborted = false;
      this.timing.markEnd('total');
      throw e;
    }
  }
}
