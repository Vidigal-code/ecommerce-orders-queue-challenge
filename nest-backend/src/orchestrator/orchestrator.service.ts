import { Injectable } from '@nestjs/common';
import { OrdersService } from '../orders/orders.service';
import { QueueService } from '../queue/services/queue.service';
import { MetricsService } from '../metrics/metrics.service';

@Injectable()
export class OrchestratorService {
    constructor(
        private readonly ordersService: OrdersService,
        private readonly queueService: QueueService,
        private readonly metricsService: MetricsService,
    ) {}

    async generateAndProcessOrders(quantity: number): Promise<void> {
        const startTime = Date.now();
        await this.ordersService.generateOrders(quantity);
        const generationTime = Date.now() - startTime;

        await this.queueService.processOrders();
        const processingTime = Date.now() - startTime - generationTime;

        await this.metricsService.recordMetrics(generationTime, processingTime, quantity);
    }

    async resetDatabase(): Promise<void> {
        await this.ordersService.clearOrders();
        await this.metricsService.clearMetrics();
        await this.queueService.clearQueue();
    }
}