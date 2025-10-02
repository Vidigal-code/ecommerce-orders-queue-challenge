import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue, JobsOptions, Job, JobType } from 'bullmq';
import { Order } from '../../../domain/entities/order.entity';
import { AsyncLogService } from '../../../shared/logs/async-log.service';
import { MetricsService } from '../../metrics/metrics.service';

type QueueCounts = Awaited<ReturnType<Queue['getJobCounts']>>;

@Injectable()
export class OrdersQueueService {
  constructor(
    @InjectQueue('orders-queue')
    private readonly ordersQueue: Queue,
    private readonly log: AsyncLogService,
    private readonly metrics: MetricsService,
  ) {}

  async addOrderToQueue(order: Order, priority: number = 2): Promise<void> {
    const opts: JobsOptions = {
      priority,
      removeOnComplete: { count: 500 },
      removeOnFail: { count: 100 },
      attempts: 1,
    };
    await this.ordersQueue.add('processOrder', order, opts);
  }

  async addBulkOrdersToQueue(orders: Order[]): Promise<void> {
    if (!orders.length) return;
    const bulkJobs = orders.map((order) => ({
      name: 'processOrder' as const,
      data: order,
      opts: {
        priority: order.priority === 'VIP' ? 1 : 2,
        removeOnComplete: { count: 500 },
        removeOnFail: { count: 100 },
        attempts: 1,
      } satisfies JobsOptions,
    }));

    await this.ordersQueue.addBulk(bulkJobs);
  }

  async pauseQueue(): Promise<void> {
    await this.ordersQueue.pause();
    this.log.log('[OrdersQueueService] Queue paused.');
  }

  async resumeQueue(): Promise<void> {
    await this.ordersQueue.resume();
    this.log.log('[OrdersQueueService] Queue resumed.');
  }

  async clean(
    state:
      | 'completed'
      | 'wait'
      | 'failed'
      | 'delayed'
      | 'waiting-children'
      | 'paused',
    grace = 0,
    limit = 1000,
  ): Promise<number> {
    try {
      const jobs = await this.ordersQueue.clean(
        grace,
        limit,
        state as Parameters<Queue['clean']>[2],
      );
      this.log.log(
        `[OrdersQueueService] Cleaned ${jobs.length} jobs from state=${state}`,
      );
      return jobs.length;
    } catch (e: any) {
      this.log.warn(
        `[OrdersQueueService] Failed to clean state=${state}: ${e?.message}`,
      );
      return 0;
    }
  }

  async getCounts(): Promise<QueueCounts & { paused: boolean }> {
    const counts = await this.ordersQueue.getJobCounts(
      'waiting',
      'active',
      'completed',
      'failed',
      'delayed',
      'paused',
    );
    let paused = false;
    try {
      paused = await this.ordersQueue.isPaused();
    } catch {}
    Object.entries(counts).forEach(([k, v]) =>
      this.metrics.setQueueMetric(k, v as number),
    );
    this.metrics.setQueueMetric('pausedFlag', paused ? 1 : 0);
    const result = { ...counts, paused } as unknown as QueueCounts & {
      paused: boolean;
    };
    return result;
  }

  async closeQueue(): Promise<void> {
    await this.ordersQueue.close();
    this.log.log('[OrdersQueueService] Queue connection closed');
  }

  async getJobs(
    types: Array<
      | 'waiting'
      | 'active'
      | 'delayed'
      | 'completed'
      | 'failed'
      | 'waiting-children'
      | 'paused'
    > = ['waiting'],
    start = 0,
    end = 50,
  ): Promise<Job[]> {
    const jobs = await this.ordersQueue.getJobs(types as JobType[], start, end);
    return jobs.filter(Boolean);
  }

  async purgeAll(options?: { obliterate?: boolean }): Promise<void> {
    if (options?.obliterate) {
      try {
        await this.ordersQueue.obliterate({ force: true });
        this.log.log('[OrdersQueueService] Queue obliterated.');
        return;
      } catch (err: any) {
        this.log.warn(`[OrdersQueueService] Falha obliterate: ${err?.message}`);
      }
    }
    try {
      await this.ordersQueue.drain();
    } catch {}
    await this.ordersQueue.clean(0, 5000, 'completed');
    await this.ordersQueue.clean(0, 5000, 'failed');
    this.log.log('[OrdersQueueService] Purge attempt completed.');
  }

  async recoverStuckActiveJobs(
    maxJobs = 100,
    options?: {
      ignoreJobIds?: Array<string | number>;
      ignoreJobNames?: string[];
    },
  ): Promise<number> {
    const ignoreIds = new Set((options?.ignoreJobIds ?? []).map(String));
    const ignoreNames = new Set(options?.ignoreJobNames ?? []);
    let recovered = 0;
    try {
      this.log.warn('[OrdersQueueService] Verificando jobs ativos travados...');
      const rawActiveJobs = await this.getJobs(['active'], 0, maxJobs);
      const activeJobs = rawActiveJobs.filter((job) => {
        const jobIdStr = job?.id != null ? String(job.id) : '';
        if (ignoreIds.has(jobIdStr) || ignoreNames.has(job.name)) {
          this.log.log(
            `[OrdersQueueService] Ignorando job ativo ${job.id} (${job.name}) durante verificação de travamento`,
          );
          return false;
        }
        return true;
      });

      if (activeJobs.length === 0) {
        return 0;
      }

      this.log.warn(
        `[OrdersQueueService] Tentando recuperar ${activeJobs.length} jobs ativos que podem estar travados`,
      );

      const now = Date.now();
      const stuckThresholdMs = 30_000;

      for (const job of activeJobs) {
        if (!job.processedOn || now - job.processedOn < stuckThresholdMs) {
          continue;
        }

        try {
          const stuckTimeMs = now - job.processedOn;
          this.log.warn(
            `[OrdersQueueService] Job ${job.id} está ativo há ${
              stuckTimeMs / 1000
            }s, forçando recuperação...`,
          );

          const currentState = await job.getState();

          if (currentState === 'active') {
            try {
              job.discard();
              this.log.log(
                `[OrdersQueueService] Job ${job.id} descartado para tentar desbloquear`,
              );
              recovered++;
            } catch (discardErr) {
              try {
                await job.moveToFailed(
                  new Error(
                    `Job forçado para falha após ficar travado por ${stuckTimeMs / 1000}s`,
                  ),
                  'manual-recovery',
                );
                this.log.log(
                  `[OrdersQueueService] Job ${job.id} movido para failed para retry posterior`,
                );
                recovered++;
              } catch (err1) {
                try {
                  const jobData = job.data;
                  const jobOpts = { ...job.opts, priority: 1 };
                  const newJob = await this.ordersQueue.add(
                    'processOrder',
                    jobData,
                    jobOpts,
                  );
                  this.log.log(
                    `[OrdersQueueService] Job duplicado como ${newJob.id} (original ${job.id} pode estar bloqueado)`,
                  );
                  recovered++;
                } catch (addErr: any) {
                  this.log.error(
                    `[OrdersQueueService] Falha ao recuperar job travado ${
                      job.id
                    }: ${addErr?.message || String(addErr)}`,
                  );
                }
              }
            }
          } else {
            this.log.log(
              `[OrdersQueueService] Job ${job.id} não está mais ativo (estado atual: ${currentState}), ignorando`,
            );
            recovered++;
          }
        } catch (err: any) {
          this.log.error(
            `[OrdersQueueService] Erro ao processar job ativo ${
              job.id
            }: ${err?.message || String(err)}`,
          );
        }
      }
    } catch (err: any) {
      this.log.error(
        `[OrdersQueueService] Erro ao recuperar jobs ativos: ${
          err?.message || String(err)
        }`,
      );
    }

    if (recovered > 0) {
      this.log.log(
        `[OrdersQueueService] Recuperados ${recovered} jobs ativos com sucesso`,
      );
    }

    return recovered;
  }

  async waitForEmpty(
    pollMs = 1000,
    timeoutMs = 1000 * 60 * 60,
    options?: {
      label?: string;
      stuckThresholdMs?: number;
      ignoreActiveJobIds?: Array<string | number>;
      ignoreActiveJobNames?: string[];
    },
  ) {
    const ignoreIds = new Set((options?.ignoreActiveJobIds ?? []).map(String));
    const ignoreNames = new Set(options?.ignoreActiveJobNames ?? []);
    const start = Date.now();
    let lastPending: number | null = null;
    let lastFailedCount = 0;
    let lastProgressAt = Date.now();
    let lastLogAt = 0;
    let lastRetryCheckAt = 0;
    let lastStuckJobCheckAt = 0;
    const label = options?.label ?? 'orders-queue';
    const stuckThreshold = options?.stuckThresholdMs ?? 60_000;
    const retryCheckInterval = 30_000;
    const stuckJobCheckInterval = 15_000;

    while (true) {
      const counts = await this.getCounts();

      let ignoredActiveCount = 0;
      let effectiveActive = counts.active || 0;

      if (ignoreIds.size || ignoreNames.size) {
        const activeJobsSnapshot = await this.getJobs(
          ['active'],
          0,
          Math.max(effectiveActive || 0, 100),
        );
        ignoredActiveCount = activeJobsSnapshot.filter((job) => {
          const jobIdStr = job?.id != null ? String(job.id) : '';
          return ignoreIds.has(jobIdStr) || ignoreNames.has(job.name);
        }).length;
        effectiveActive = Math.max(effectiveActive - ignoredActiveCount, 0);
      }

      const pending =
        (counts.waiting || 0) +
        effectiveActive +
        (counts.delayed || 0) +
        (counts['waiting-children'] || 0);

      const now = Date.now();

      if (pending === 0) {
        this.log.log(
          `[OrdersQueueService] Fila ${label} está vazia (wait=${counts.waiting ?? 0}, active=${effectiveActive}${ignoredActiveCount ? ` (ignored ${ignoredActiveCount})` : ''}, delayed=${counts.delayed ?? 0}).`,
        );
        return;
      }

      if (lastPending === null || pending < lastPending) {
        lastProgressAt = now;
      }

      if (now - lastLogAt >= Math.max(5_000, pollMs)) {
        this.log.log(
          `[OrdersQueueService] Aguardando drain (${label}) pending=${pending} (wait=${counts.waiting ?? 0}, active=${effectiveActive}${ignoredActiveCount ? ` (ignored ${ignoredActiveCount})` : ''}, delayed=${counts.delayed ?? 0}, failed=${counts.failed ?? 0}).`,
        );
        lastLogAt = now;
      }

      if (
        (counts.failed || 0) > 0 &&
        now - lastRetryCheckAt > retryCheckInterval
      ) {
        this.log.warn(
          `[OrdersQueueService] Encontrados ${counts.failed} jobs com falha em ${label}. Tentando recuperar...`,
        );
        try {
          const failedJobs = await this.getJobs(['failed'], 0, 100);
          if (failedJobs.length > 0) {
            this.log.log(
              `[OrdersQueueService] Tentando retomar ${failedJobs.length} jobs com falha...`,
            );
            for (const job of failedJobs) {
              try {
                await job.retry();
              } catch (err: any) {
                this.log.warn(
                  `[OrdersQueueService] Falha ao retomar job ${job.id}: ${err?.message}`,
                );
              }
            }
            lastProgressAt = now;
          }
        } catch (err: any) {
          this.log.warn(
            `[OrdersQueueService] Erro ao tentar recuperar jobs: ${err?.message}`,
          );
        }
        lastRetryCheckAt = now;
      }

      if (
        effectiveActive > 0 &&
        (now - lastStuckJobCheckAt > stuckJobCheckInterval ||
          (lastPending !== null &&
            pending === lastPending &&
            now - lastProgressAt > stuckThreshold / 2))
      ) {
        this.log.warn(
          `[OrdersQueueService] ${effectiveActive} jobs ativos em ${label} podem estar travados (sem progresso há ${(now - lastProgressAt) / 1000}s).`,
        );

        const recovered = await this.recoverStuckActiveJobs(counts.active, {
          ignoreJobIds: Array.from(ignoreIds),
          ignoreJobNames: Array.from(ignoreNames),
        });
        if (recovered > 0) {
          lastProgressAt = now;
          this.log.log(
            `[OrdersQueueService] Recuperados ${recovered} jobs, resetando timer de progresso`,
          );
        } else if (
          (lastPending !== null && effectiveActive < lastPending) ||
          counts.waiting > 0
        ) {
          lastProgressAt = now;
          this.log.log(
            `[OrdersQueueService] Progresso detectado, resetando timer de progresso`,
          );
        }

        lastStuckJobCheckAt = now;
      }

      const currentTotal = pending + (counts.failed || 0);
      if (lastPending !== null) {
        const previousTotal = lastPending + lastFailedCount;
        if (currentTotal < previousTotal) {
          lastProgressAt = now;
        }
      }

      if (now - start > timeoutMs) {
        await this.recoverStuckActiveJobs(100, {
          ignoreJobIds: Array.from(ignoreIds),
          ignoreJobNames: Array.from(ignoreNames),
        });
        throw new Error(`Timeout aguardando fila ${label} esvaziar`);
      }

      if (now - lastProgressAt > stuckThreshold) {
        await this.clean('failed', 0, 1000);
        await this.recoverStuckActiveJobs(100, {
          ignoreJobIds: Array.from(ignoreIds),
          ignoreJobNames: Array.from(ignoreNames),
        });

        if (now - lastProgressAt > stuckThreshold * 3) {
          throw new Error(
            `Fila ${label} aparenta estar travada (sem progresso há ${(now - lastProgressAt) / 1000}s). Verifique workers ou jobs com falha.`,
          );
        } else {
          lastProgressAt = now;
        }
      }

      lastPending = pending;
      lastFailedCount = counts.failed || 0;
      await new Promise((r) => setTimeout(r, pollMs));
    }
  }
}
