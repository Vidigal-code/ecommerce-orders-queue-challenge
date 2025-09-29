import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import { LogService } from '../../shared/logs/log.service';
import { OrdersProcessor } from '../../infrastructure/queue/orders.processor';

@Injectable()
export class GenerateOrdersUseCase {
    private readonly MAX_ORDERS: number;

    constructor(
        @InjectQueue('orders-queue')
        private readonly ordersQueue: Queue,
        private readonly logService: LogService,
        private readonly ordersProcessor: OrdersProcessor,
    ) {
        this.MAX_ORDERS = parseInt(process.env.MAX_ORDERS || '1500000', 10);
    }

    private async ensureQueueReady(timeoutMs = 3000): Promise<void> {
        try {
            const readyPromise = this.ordersQueue.isReady();
            const timeout = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Queue readiness timeout')), timeoutMs),
            );
            await Promise.race([readyPromise, timeout]);
        } catch (err) {
            this.logService.warn(`[GenerateOrdersUseCase] Queue not ready: ${(err as any)?.message ?? err}`);
            throw err;
        }
    }

    async execute(quantity: number): Promise<string> {
        const phase = this.ordersProcessor.getPhase();
        if (!['IDLE', 'DONE', 'ERROR'].includes(phase)) {
            const msg = `[GenerateOrdersUseCase] Já existe um processamento em andamento (phase=${phase}). Aguarde ou cancele antes de iniciar outro.`;
            this.logService.warn(msg);
            throw new Error(msg);
        }

        this.logService.log(`[GenerateOrdersUseCase] Iniciando enfileiramento master quantity=${quantity}`);
        if (!Number.isFinite(quantity) || quantity <= 0) {
            const msg = `[GenerateOrdersUseCase] Parâmetro inválido 'quantity': ${quantity}`;
            this.logService.error(msg);
            throw new Error(msg);
        }
        if (quantity > this.MAX_ORDERS) {
            const msg = `[GenerateOrdersUseCase] quantity excede limite (${this.MAX_ORDERS})`;
            this.logService.error(msg);
            throw new Error(msg);
        }

        try {
            await this.ensureQueueReady(3000);
            const addPromise = this.ordersQueue.add('generateOrders', { quantity }, { removeOnComplete: true });
            const timeout = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Timeout ao adicionar job na fila')), 5000),
            );
            await Promise.race([addPromise, timeout]);
            this.logService.log('[GenerateOrdersUseCase] Job "generateOrders" adicionado à fila com sucesso.');
            return 'Processo iniciado: geração + processamento em duas fases (VIP -> NORMAL).';
        } catch (err) {
            this.logService.error(`[GenerateOrdersUseCase] Erro ao enfileirar job: ${(err as any)?.message ?? err}`);
            throw err;
        }
    }
}