import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import type { Queue, Job } from 'bull';
import { Order } from '../../domain/entities/order.entity';
import { LogService } from '../../shared/logs/log.service';

@Injectable()
export class OrdersQueueService {
    constructor(
        @InjectQueue('orders-queue')
        private readonly ordersQueue: Queue,
        private readonly logService: LogService,
    ) {}

    async addOrderToQueue(order: Order, priority: number = 2): Promise<void> {
        await this.ordersQueue.add('processOrder', order, {
            priority,
            removeOnComplete: true,
            removeOnFail: true,
        });
    }

    async addBulkOrdersToQueue(orders: Order[]): Promise<void> {
        if (!orders.length) return;
        const jobs = orders.map(order => {
            const prio = order.priority === 'VIP' ? 1 : 2;
            return this.ordersQueue.add('processOrder', order, {
                priority: prio,
                removeOnComplete: true,
                removeOnFail: true,
            });
        });
        await Promise.all(jobs);
    }

    async pauseQueue(global = true): Promise<void> {
        await this.ordersQueue.pause(global);
        this.logService.log(`[OrdersQueueService] Queue paused (global=${global})`);
    }

    async resumeQueue(global = true): Promise<void> {
        await this.ordersQueue.resume(global);
        this.logService.log(`[OrdersQueueService] Queue resumed (global=${global})`);
    }

    async clean(state: 'wait'|'active'|'delayed'|'completed'|'failed', grace = 0): Promise<number> {
        const jobs = await this.ordersQueue.clean(grace, state);
        this.logService.log(`[OrdersQueueService] Cleaned ${jobs.length} jobs from state=${state}`);
        return jobs.length;
    }

    async getCounts(): Promise<any> {
        const waiting = await this.ordersQueue.getWaitingCount();
        const active = await this.ordersQueue.getActiveCount();
        const completed = await this.ordersQueue.getCompletedCount();
        const failed = await this.ordersQueue.getFailedCount();
        const delayed = await this.ordersQueue.getDelayedCount();
        const paused = await this.ordersQueue.isPaused();
        return { waiting, active, completed, failed, delayed, paused };
    }

    async closeQueue(): Promise<void> {
        await this.ordersQueue.close();
        this.logService.log('[OrdersQueueService] Queue connection closed');
    }

    async getJobs(types: Array<'waiting'|'active'|'delayed'|'completed'|'failed'> = ['waiting'] , start = 0, end = 50): Promise<Job[]> {
        return await this.ordersQueue.getJobs(types, start, end);
    }

    async purgeAll(): Promise<void> {
        try { await this.clean('wait'); } catch {}
        try { await this.clean('active'); } catch {}
        try { await this.clean('delayed'); } catch {}
        try { await this.clean('completed'); } catch {}
        try { await this.clean('failed'); } catch {}
        this.logService.log('[OrdersQueueService] Purge attempt completed.');
    }
}