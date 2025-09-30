import { Processor, Process } from '@nestjs/bull';
import type { Job } from 'bull';
import { Inject, Injectable } from '@nestjs/common';
import * as orderRepository from '../../../domain/repositories/order.repository';
import { OrdersQueueService } from '../services/orders-queue.service';
import { Order, Tier, Priority } from '../../../domain/entities/order.entity';
import { v4 as uuidv4 } from 'uuid';
import { LogsUseCase } from '../../../application/use-cases/logs.usecase';
import { LogService } from '../../../shared/logs/log.service';
import { Phase } from '../types/phase.types';
import { OrdersProcessStateService } from '../services/orders-process-state.service';

const RANDOM_OBSERVATIONS = [
  'Pedido padrão',
  'Cliente frequente',
  'Primeira compra',
  'Promoção especial',
  'Cupom aplicado',
  'Frete grátis',
  'Entrega expressa solicitada',
  'Cliente premium',
  'Desconto de fidelidade',
  'Compra em lote',
];

const GENERATION_CHUNK_SIZE = parseInt(
  process.env.GENERATION_CHUNK_SIZE || '10000',
  10,
);
const NORMAL_ENQUEUE_BATCH_SIZE = parseInt(
  process.env.NORMAL_ENQUEUE_BATCH_SIZE || '10000',
  10,
);
const LOG_MEMORY = (process.env.LOG_MEMORY || 'false') === 'true';
const LOG_PROGRESS_EVERY_MS = parseInt(
  process.env.LOG_PROGRESS_EVERY_MS || '5000',
  10,
);

@Processor('orders-queue')
@Injectable()
export class OrdersGenerationProcessor {
  constructor(
    @Inject('IOrderRepository')
    private readonly orderRepo: orderRepository.IOrderRepository,
    private readonly queueService: OrdersQueueService,
    private readonly logsUseCase: LogsUseCase,
    private readonly logService: LogService,
    private readonly state: OrdersProcessStateService,
  ) {
    this.logsUseCase.setPhase?.(this.state.getPhase());
  }

  private setPhase(phase: Phase) {
    this.state.setPhase(phase);
    try {
      this.logsUseCase.setPhase(phase);
    } catch (e) {
      this.logService.warn(
        '[OrdersGenerationProcessor] Falha setPhase -> LogsUseCase: ' +
          (e as any)?.message,
      );
    }
    this.logService.log(`[OrdersGenerationProcessor] Phase => ${phase}`);
  }

  abort() {
    if (this.state.isAborting()) return;
    this.state.setAborted(true);
    this.setPhase('ABORTED');
    this.logService.warn('[OrdersGenerationProcessor] Abort solicitado.');
  }

  private ensureNotAborted() {
    if (this.state.isAborting())
      throw new Error('Processo abortado manualmente');
  }

  private async waitForQueueDrained(
    pollIntervalMs = 1000,
    timeoutMs = 1000 * 60 * 60,
  ) {
    const start = Date.now();
    while (true) {
      this.ensureNotAborted();
      const counts = await this.queueService.getCounts();
      const pending =
        (counts.waiting || 0) + (counts.active || 0) + (counts.delayed || 0);
      if (pending === 0) return;
      if (Date.now() - start > timeoutMs) {
        throw new Error('Timeout aguardando drenagem da fila');
      }
      await new Promise((res) => setTimeout(res, pollIntervalMs));
    }
  }

  private async finalizePersist(partial = false) {
    try {
      await this.logsUseCase.persistRun();
      this.logService.log(
        `[OrdersGenerationProcessor] Execução${
          partial ? ' parcial' : ''
        } registrada (process_runs).`,
      );
    } catch (err) {
      this.logService.warn(
        '[OrdersGenerationProcessor] Falha ao persistir run: ' +
          (err as any)?.message,
      );
    }
  }

  private buildOrder(index: number): Order {
    const tier = Object.values(Tier)[Math.floor(Math.random() * 4)];
    const priority = tier === Tier.DIAMANTE ? Priority.VIP : Priority.NORMAL;
    const randomObservation =
      RANDOM_OBSERVATIONS[
        Math.floor(Math.random() * RANDOM_OBSERVATIONS.length)
      ];
    return {
      id: uuidv4(),
      cliente: `Cliente ${index}`,
      valor: parseFloat((Math.random() * 1000).toFixed(2)),
      tier,
      observacoes: randomObservation,
      priority,
      status: 'pendente',
      createdAt: new Date(),
    };
  }

  @Process('generateOrders')
  async handleGenerateOrders(job: Job<{ quantity: number }>) {
    this.state.setActiveGenerateJobId(job.id?.toString() || null);
    this.state.setAborted(false);

    const { quantity } = job.data;
    this.setPhase('GENERATING');
    this.logService.log(
      `[OrdersGenerationProcessor] Iniciando geração de pedidos: ${quantity} | chunk=${GENERATION_CHUNK_SIZE}`,
    );

    const generationStart = Date.now();
    let generated = 0;

    let vipEnqueueStart: number | null = null;
    let vipEnqueueEnd: number | null = null;
    let lastProgressLog = 0;

    try {
      while (generated < quantity) {
        this.ensureNotAborted();

        const currentChunk = Math.min(
          GENERATION_CHUNK_SIZE,
          quantity - generated,
        );
        const vipOrders: Order[] = [];
        const normalOrders: Order[] = [];

        for (let i = 0; i < currentChunk; i++) {
          this.ensureNotAborted();
          const order = this.buildOrder(generated + i);
          if (order.priority === Priority.VIP) vipOrders.push(order);
          else normalOrders.push(order);
        }

        try {
          await this.orderRepo.bulkSave([...vipOrders, ...normalOrders]);
        } catch (err) {
          this.logService.error(
            '[OrdersGenerationProcessor] Erro bulkSave chunk: ' +
              (err as any)?.message,
          );
        }

        if (vipOrders.length) {
          if (vipEnqueueStart == null) {
            vipEnqueueStart = Date.now();
            this.setPhase('ENQUEUE_VIP');
          }
          try {
            await this.queueService.addBulkOrdersToQueue(vipOrders);
          } catch (err) {
            this.logService.error(
              '[OrdersGenerationProcessor] Erro ao enfileirar VIP chunk: ' +
                (err as any)?.message,
            );
          }
          vipEnqueueEnd = Date.now();
        }

        generated += currentChunk;
        this.logsUseCase.incrementGenerated(currentChunk);

        const now = Date.now();
        if (now - lastProgressLog >= LOG_PROGRESS_EVERY_MS) {
          const percent = ((generated / quantity) * 100).toFixed(2);
          this.logService.log(
            `[OrdersGenerationProcessor] Progresso geração: ${generated}/${quantity} (${percent}%)`,
          );
          if (LOG_MEMORY) {
            const mem = process.memoryUsage();
            this.logService.log(
              `[OrdersGenerationProcessor] Memória: rss=${(
                mem.rss /
                1024 /
                1024
              ).toFixed(
                1,
              )}MB heapUsed=${(mem.heapUsed / 1024 / 1024).toFixed(1)}MB`,
            );
          }
          lastProgressLog = now;
        }

        if (generated < quantity && !this.state.isAborting()) {
          this.setPhase('GENERATING');
        }
      }

      this.ensureNotAborted();

      const generationEnd = Date.now();
      this.logsUseCase.setGenerationTime(generationEnd - generationStart);

      const vipEnqueueTime =
        vipEnqueueStart && vipEnqueueEnd ? vipEnqueueEnd - vipEnqueueStart : 0;
      this.state.setEnqueueVipTime(vipEnqueueTime);
      this.logsUseCase.setEnqueueVipTime(vipEnqueueTime);

      this.setPhase('WAITING_VIP_DRAIN');
      this.logService.log(
        '[OrdersGenerationProcessor] Geração concluída. Aguardando processamento completo dos VIP.',
      );

      try {
        await this.waitForQueueDrained();

        await this.finalizePersist(true);
        this.logService.log(
          '[OrdersGenerationProcessor] VIP processados. Iniciando enfileiramento NORMAL.',
        );
      } catch (err) {
        if (this.state.isAborting()) {
          this.setPhase('ABORTED');
        } else {
          this.setPhase('ERROR');
          this.logService.warn(
            '[OrdersGenerationProcessor] Timeout/erro aguardando VIP: ' +
              (err as any)?.message,
          );
        }
        await this.finalizePersist();
        return;
      }

      this.ensureNotAborted();

      if (this.state.isAborting()) {
        this.setPhase('ABORTED');
        await this.finalizePersist();
        return;
      }

      this.setPhase('ENQUEUE_NORMAL');
      const normalEnqueueStart = Date.now();
      try {
        if (typeof this.orderRepo.iterateByPriority === 'function') {
          for await (const batch of this.orderRepo.iterateByPriority(
            Priority.NORMAL,
            NORMAL_ENQUEUE_BATCH_SIZE,
          )) {
            this.ensureNotAborted();
            if (this.state.isAborting()) break;
            if (batch.length) {
              await this.queueService.addBulkOrdersToQueue(batch);
              this.logService.log(
                `[OrdersGenerationProcessor][Enqueue NORMAL] Lote acumulado de ${batch.length} pedidos`,
              );
            }
          }
        } else {
          const normalOrders = await this.orderRepo.findByPriority(
            Priority.NORMAL,
          );
          for (
            let i = 0;
            i < normalOrders.length;
            i += NORMAL_ENQUEUE_BATCH_SIZE
          ) {
            this.ensureNotAborted();
            if (this.state.isAborting()) break;
            const slice = normalOrders.slice(i, i + NORMAL_ENQUEUE_BATCH_SIZE);
            await this.queueService.addBulkOrdersToQueue(slice);
            this.logService.log(
              `[OrdersGenerationProcessor][Enqueue NORMAL] Lote ${
                i + slice.length
              }/${normalOrders.length}`,
            );
          }
        }
      } catch (err) {
        if (this.state.isAborting()) {
          this.setPhase('ABORTED');
        } else {
          this.logService.error(
            '[OrdersGenerationProcessor] Falha ao enfileirar NORMAL: ' +
              (err as any)?.message,
          );
          this.setPhase('ERROR');
        }
        await this.finalizePersist();
        return;
      }
      const normalEnqueueEnd = Date.now();
      const normalEnqueueTime = normalEnqueueEnd - normalEnqueueStart;
      this.state.setEnqueueNormalTime(normalEnqueueTime);
      this.logsUseCase.setEnqueueNormalTime(normalEnqueueTime);

      if (this.state.isAborting()) {
        this.setPhase('ABORTED');
        await this.finalizePersist();
        return;
      }

      this.setPhase('WAITING_NORMAL_DRAIN');
      this.logService.log(
        '[OrdersGenerationProcessor] Aguardando fila drenar NORMAL...',
      );
      try {
        await this.waitForQueueDrained();
        if (!this.state.isAborting()) {
          this.setPhase('DONE');
          this.logService.log(
            '[OrdersGenerationProcessor] Todas as fases concluídas.',
          );
        } else {
          this.setPhase('ABORTED');
        }
      } catch (err) {
        if (this.state.isAborting()) {
          this.setPhase('ABORTED');
        } else {
          this.setPhase('ERROR');
          this.logService.warn(
            '[OrdersGenerationProcessor] Timeout aguardando NORMAL: ' +
              (err as any)?.message,
          );
        }
      }

      await this.finalizePersist();
    } catch (fatal) {
      if (this.state.isAborting()) {
        this.setPhase('ABORTED');
        this.logService.warn(
          '[OrdersGenerationProcessor] Finalização por aborto: ' +
            (fatal as any)?.message,
        );
      } else {
        this.setPhase('ERROR');
        this.logService.error(
          '[OrdersGenerationProcessor] Erro fatal: ' + (fatal as any)?.message,
        );
      }
      await this.finalizePersist();
    } finally {
      this.state.setActiveGenerateJobId(null);
    }
  }
}
