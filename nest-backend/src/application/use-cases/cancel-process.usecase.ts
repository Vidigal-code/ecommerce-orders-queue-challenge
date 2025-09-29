import { Injectable, Inject } from '@nestjs/common';
import { OrdersProcessor } from '../../infrastructure/queue/orders.processor';
import { OrdersQueueService } from '../../infrastructure/queue/orders-queue.service';
import * as orderRepository from '../../domain/repositories/order.repository';
import { LogsUseCase } from './logs.usecase';

@Injectable()
export class CancelProcessUseCase {
    constructor(
        private readonly ordersProcessor: OrdersProcessor,
        private readonly queueService: OrdersQueueService,
        @Inject('IOrderRepository')
        private readonly orderRepo: orderRepository.IOrderRepository,
        private readonly logsUseCase: LogsUseCase,
    ) {}

    async execute(options?: { purge?: boolean; resetLogs?: boolean; removePending?: boolean; }): Promise<{
        aborted: boolean;
        queuePaused: boolean;
        removedPending?: number;
        purged?: boolean;
        logsReset?: boolean;
        message: string;
    }> {
        const { purge = true, resetLogs = false, removePending = true } = options || {};

        if (!this.ordersProcessor.hasActiveGeneration() && !this.ordersProcessor.isAborting()) {
            return {
                aborted: false,
                queuePaused: false,
                message: 'Nenhuma geração ativa para cancelar.',
            };
        }

        this.ordersProcessor.abort();

        try {
            await this.queueService.pauseQueue(true);
        } catch {}

        await new Promise(r => setTimeout(r, 1500));

        let removedPending = 0;
        if (removePending) {
            try {
                removedPending = await this.orderRepo.deletePending();
            } catch {}
        }

        if (purge) {
            try {
                await this.queueService.purgeAll();
            } catch {}
        }

        if (resetLogs) {
            this.logsUseCase.resetLogs();
        }

        return {
            aborted: true,
            queuePaused: true,
            removedPending,
            purged: purge,
            logsReset: resetLogs,
            message: 'Processo de geração/execução abortado e limpeza executada.',
        };
    }
}