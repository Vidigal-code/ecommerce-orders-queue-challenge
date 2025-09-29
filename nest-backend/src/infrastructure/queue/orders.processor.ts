import { Processor, Process } from '@nestjs/bull';
import type { Job } from 'bull';
import { Inject, Injectable } from '@nestjs/common';
import * as orderRepository from '../../domain/repositories/order.repository';
import { OrdersQueueService } from './orders-queue.service';
import { Order, Tier, Priority } from '../../domain/entities/order.entity';
import { v4 as uuidv4 } from 'uuid';
import { LogsUseCase } from '../../application/use-cases/logs.usecase';
import { LogService } from '../../shared/logs/log.service';

const PROCESS_CONCURRENCY = parseInt(process.env.ORDERS_QUEUE_CONCURRENCY || '25', 10);

export type Phase =
    | 'IDLE'
    | 'GENERATING'
    | 'ENQUEUE_VIP'
    | 'WAITING_VIP_DRAIN'
    | 'ENQUEUE_NORMAL'
    | 'WAITING_NORMAL_DRAIN'
    | 'DONE'
    | 'ERROR';

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

@Processor('orders-queue')
@Injectable()
export class OrdersProcessor {
    private phase: Phase = 'IDLE';
    private enqueueVipTimeMs = 0;
    private enqueueNormalTimeMs = 0;
    private aborted = false;
    private activeGenerateJobId: string | null = null;

    constructor(
        @Inject('IOrderRepository')
        private readonly orderRepo: orderRepository.IOrderRepository,
        private readonly queueService: OrdersQueueService,
        private readonly logsUseCase: LogsUseCase,
        private readonly logService: LogService,
    ) {
        //this.logService.log('[OrdersProcessor] Inicializado.');
        this.logsUseCase.setPhase?.(this.phase);
    }

    private setPhase(phase: Phase) {
        this.phase = phase;
        try {
            this.logsUseCase.setPhase(phase);
        } catch (e) {
            this.logService.warn('[OrdersProcessor] Falha setPhase -> LogsUseCase: ' + (e as any)?.message);
        }
        this.logService.log(`[OrdersProcessor] Phase => ${phase}`);
    }

    getPhase(): Phase {
        return this.phase;
    }

    getEnqueueVipTimeMs() {
        return this.enqueueVipTimeMs;
    }

    getEnqueueNormalTimeMs() {
        return this.enqueueNormalTimeMs;
    }

    isAborting(): boolean {
        return this.aborted;
    }

    hasActiveGeneration(): boolean {
        return !!this.activeGenerateJobId;
    }

    abort() {
        if (this.aborted) return;
        this.aborted = true;
        this.setPhase('ERROR');
        this.logService.warn('[OrdersProcessor] Abort solicitado.');
    }

    private async waitForQueueDrained(pollIntervalMs = 1000, timeoutMs = 1000 * 60 * 60) {
        const start = Date.now();
        while (true) {
            if (this.aborted) throw new Error('Processo abortado manualmente');
            const counts = await this.queueService.getCounts();
            const pending = (counts.waiting || 0) + (counts.active || 0) + (counts.delayed || 0);
            if (pending === 0) return;
            if (Date.now() - start > timeoutMs) {
                throw new Error('Timeout aguardando drenagem da fila');
            }
            await new Promise((res) => setTimeout(res, pollIntervalMs));
        }
    }

    @Process('generateOrders')
    async handleGenerateOrders(job: Job<{ quantity: number }>) {
        this.activeGenerateJobId = job.id?.toString() || null;
        this.aborted = false;
        const { quantity } = job.data;
        this.setPhase('GENERATING');
        this.logService.log('[GenerateOrders] Iniciando geração de pedidos: ' + quantity);

        const generationStart = Date.now();
        const chunkSize = 10_000;
        let generated = 0;

        let vipEnqueueStart: number | null = null;
        let vipEnqueueEnd: number | null = null;

        try {
            while (generated < quantity) {
                if (this.aborted) throw new Error('Processo abortado manualmente');

                const currentChunk = Math.min(chunkSize, quantity - generated);
                const vipOrders: Order[] = [];
                const normalOrders: Order[] = [];

                for (let i = 0; i < currentChunk; i++) {
                    if (this.aborted) throw new Error('Processo abortado manualmente');

                    const tier = Object.values(Tier)[Math.floor(Math.random() * 4)];
                    const priority = tier === Tier.DIAMANTE ? Priority.VIP : Priority.NORMAL;
                    const randomObservation = RANDOM_OBSERVATIONS[Math.floor(Math.random() * RANDOM_OBSERVATIONS.length)];

                    const order: Order = {
                        id: uuidv4(),
                        cliente: `Cliente ${generated + i}`,
                        valor: parseFloat((Math.random() * 1000).toFixed(2)),
                        tier,
                        observacoes: randomObservation,
                        priority,
                        status: 'pendente',
                        createdAt: new Date(),
                    };
                    if (priority === Priority.VIP) vipOrders.push(order); else normalOrders.push(order);
                }

                try {
                    await this.orderRepo.bulkSave([...vipOrders, ...normalOrders]);
                } catch (err) {
                    this.logService.error('[GenerateOrders] Erro bulkSave chunk: ' + (err as any)?.message);
                }

                if (vipOrders.length) {
                    if (vipEnqueueStart == null) {
                        vipEnqueueStart = Date.now();
                        this.setPhase('ENQUEUE_VIP');
                    }
                    try {
                        await this.queueService.addBulkOrdersToQueue(vipOrders);
                    } catch (err) {
                        this.logService.error('[GenerateOrders] Erro ao enfileirar VIP chunk: ' + (err as any)?.message);
                    }
                    vipEnqueueEnd = Date.now();
                }

                generated += currentChunk;
                this.logService.log(`[GenerateOrders] Progresso: ${generated}/${quantity}`);

                if (generated < quantity && !this.aborted) {
                    this.setPhase('GENERATING');
                }
            }

            if (this.aborted) throw new Error('Processo abortado manualmente');

            const generationEnd = Date.now();
            const generationTimeMs = generationEnd - generationStart;
            this.logsUseCase.setGenerationTime(generationTimeMs);

            this.enqueueVipTimeMs = (vipEnqueueStart && vipEnqueueEnd) ? (vipEnqueueEnd - vipEnqueueStart) : 0;
            this.logsUseCase.setEnqueueVipTime(this.enqueueVipTimeMs);

            this.setPhase('WAITING_VIP_DRAIN');
            this.logService.log('[GenerateOrders] Geração concluída. Aguardando processamento completo dos VIP.');

            try {
                await this.waitForQueueDrained();
                this.logService.log('[GenerateOrders] VIP processados. Iniciando enfileiramento NORMAL.');
            } catch (err) {
                this.setPhase('ERROR');
                this.logService.warn('[GenerateOrders] Timeout/erro aguardando VIP: ' + (err as any)?.message);
                await this.finalizePersist();
                return;
            }

            if (this.aborted) throw new Error('Processo abortado manualmente');

            this.setPhase('ENQUEUE_NORMAL');
            const normalEnqueueStart = Date.now();
            try {
                const normalOrders = await this.orderRepo.findByPriority(Priority.NORMAL);
                const batchSize = 10_000;
                for (let i = 0; i < normalOrders.length; i += batchSize) {
                    if (this.aborted) throw new Error('Processo abortado manualmente');
                    const slice = normalOrders.slice(i, i + batchSize);
                    await this.queueService.addBulkOrdersToQueue(slice);
                    this.logService.log(`[Enqueue NORMAL] Lote ${i + slice.length}/${normalOrders.length}`);
                }
            } catch (err) {
                this.logService.error('[GenerateOrders] Falha ao enfileirar NORMAL: ' + (err as any)?.message);
                this.setPhase('ERROR');
                await this.finalizePersist();
                return;
            }
            const normalEnqueueEnd = Date.now();
            this.enqueueNormalTimeMs = normalEnqueueEnd - normalEnqueueStart;
            this.logsUseCase.setEnqueueNormalTime(this.enqueueNormalTimeMs);

            this.setPhase('WAITING_NORMAL_DRAIN');
            this.logService.log('[GenerateOrders] Aguardando fila drenar NORMAL...');
            try {
                await this.waitForQueueDrained();
                if (!this.aborted) {
                    this.setPhase('DONE');
                    this.logService.log('[GenerateOrders] Todas as fases concluídas.');
                } else {
                    this.setPhase('ERROR');
                }
            } catch (err) {
                this.setPhase('ERROR');
                this.logService.warn('[GenerateOrders] Timeout aguardando NORMAL: ' + (err as any)?.message);
            }

            await this.finalizePersist();
        } catch (fatal) {
            this.setPhase('ERROR');
            this.logService.error('[GenerateOrders] Erro fatal: ' + (fatal as any)?.message);
            await this.finalizePersist();
        } finally {
            this.activeGenerateJobId = null;
        }
    }

    private async finalizePersist() {
        try {
            await this.logsUseCase.persistRun();
            this.logService.log('[GenerateOrders] Execução registrada (process_runs).');
        } catch (err) {
            this.logService.warn('[GenerateOrders] Falha ao persistir run: ' + (err as any)?.message);
        }
    }

    @Process({ name: 'processOrder', concurrency: PROCESS_CONCURRENCY })
    async handleProcessOrder(job: Job<Order>) {
        const order: Order = job.data;
        try {
            this.logsUseCase.markStart(order.priority as Priority);
        } catch (err) {
            this.logService.warn('[processOrder] Erro markStart logs: ' + (err as any)?.message);
        }

        order.status = order.priority === Priority.VIP
            ? 'enviado com prioridade'
            : 'processado sem prioridade';
        order.observacoes = order.priority === Priority.VIP
            ? 'Processado via fila VIP'
            : 'Processado via fila NORMAL';

        try {
            await this.orderRepo.update(order);
            try {
                this.logsUseCase.markEnd(order.priority as Priority);
            } catch (err) {
                this.logService.warn('[processOrder] Erro markEnd logs: ' + (err as any)?.message);
            }
            //this.logService.log(`[processOrder] Pedido processado: ${order.id} (${order.priority})`);
        } catch (err) {
            this.logService.error(`[processOrder] Erro ao atualizar pedido ${order.id}: ${(err as any)?.message}`);
        }
    }
}