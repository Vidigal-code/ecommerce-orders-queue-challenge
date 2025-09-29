import { Controller, Get, Post, Query, DefaultValuePipe, ParseIntPipe, Inject } from '@nestjs/common';
import { GenerateOrdersUseCase } from '../../application/use-cases/generate-orders.usecase';
import { LogsUseCase } from '../../application/use-cases/logs.usecase';
import { ResetOrdersUseCase } from '../../application/use-cases/reset-orders.usecase';
import { OrdersQueueService } from '../../infrastructure/queue/orders-queue.service';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import { LogService } from '../../shared/logs/log.service';
import { LogViewer } from '../../shared/logs/log.viewer';
import type { IProcessRunRepository } from '../../domain/repositories/process-run.repository';
import { OrdersProcessor } from '../../infrastructure/queue/orders.processor';
import { OrdersStatusDto } from '../dto/orders-status.dto';
import { CancelProcessUseCase } from '../../application/use-cases/cancel-process.usecase';

@Controller('pedidos')
export class OrdersController {
    constructor(
        private readonly generateOrdersUseCase: GenerateOrdersUseCase,
        private readonly logsUseCase: LogsUseCase,
        private readonly resetOrdersUseCase: ResetOrdersUseCase,
        private readonly queueService: OrdersQueueService,
        private readonly ordersProcessor: OrdersProcessor,
        private readonly cancelProcessUseCase: CancelProcessUseCase,
        @InjectQueue('orders-queue') private readonly ordersQueue?: Queue,
        private readonly logService?: LogService,
        private readonly logViewer?: LogViewer,
        @Inject('IProcessRunRepository') private readonly processRunRepo?: IProcessRunRepository,
    ) {}

    @Post('generate')
    async generateOrders(
        @Query('quantity', new DefaultValuePipe(1000000), ParseIntPipe) quantity: number,
    ) {
        const msg = await this.generateOrdersUseCase.execute(quantity);
        return { message: msg };
    }

    @Post('process')
    async deprecatedProcess() {
        return { message: 'Processamento agora ocorre automaticamente em duas fases (VIP -> NORMAL).' };
    }

    @Post('cancel')
    async cancel(
        @Query('purge', new DefaultValuePipe('true')) purge: string,
        @Query('removePending', new DefaultValuePipe('true')) removePending: string,
        @Query('resetLogs', new DefaultValuePipe('false')) resetLogs: string,
    ) {
        const result = await this.cancelProcessUseCase.execute({
            purge: purge === 'true',
            removePending: removePending === 'true',
            resetLogs: resetLogs === 'true',
        });
        return result;
    }

    @Get()
    async getOrdersStatus(): Promise<OrdersStatusDto> {
        const processLog = await this.logsUseCase.getProcessLog();
        const latest = this.processRunRepo ? await this.processRunRepo.findLatest() : null;

        const dto: OrdersStatusDto = {
            generationTimeMs: processLog.generationTimeMs,
            enqueueVipTimeMs: processLog.enqueueVipTimeMs || 0,
            enqueueNormalTimeMs: processLog.enqueueNormalTimeMs || 0,
            processing: {
                vip: {
                    start: processLog.startVIP ? processLog.startVIP.toISOString() : null,
                    end: processLog.endVIP ? processLog.endVIP.toISOString() : null,
                    timeMs: processLog.processingTimeVIPMs,
                    count: processLog.totalProcessedVIP,
                },
                normal: {
                    start: processLog.startNormal ? processLog.startNormal.toISOString() : null,
                    end: processLog.endNormal ? processLog.endNormal.toISOString() : null,
                    timeMs: processLog.processingTimeNormalMs,
                    count: processLog.totalProcessedNormal,
                },
            },
            totalTimeMs: processLog.generationTimeMs + processLog.processingTimeVIPMs + processLog.processingTimeNormalMs,
            counts: {
                vip: processLog.totalProcessedVIP,
                normal: processLog.totalProcessedNormal,
            },
            phase: (processLog.phase as any) || this.ordersProcessor.getPhase(),
            lastRunId: latest?.runId,
        };
        return dto;
    }

    @Get('health/queue')
    async queueHealthCheck() {
        try {
            const counts = await this.queueService.getCounts();
            const phase = this.ordersProcessor.getPhase();
            const isProcessing = ['GENERATING', 'ENQUEUE_VIP', 'WAITING_VIP_DRAIN', 'ENQUEUE_NORMAL', 'WAITING_NORMAL_DRAIN'].includes(phase);

            const health = {
                status: 'healthy',
                timestamp: new Date().toISOString(),
                queue: {
                    connected: true,
                    paused: counts.paused,
                    waiting: counts.waiting,
                    active: counts.active,
                    completed: counts.completed,
                    failed: counts.failed,
                    delayed: counts.delayed,
                },
                processor: {
                    phase: phase,
                    isProcessing: isProcessing,
                    enqueueVipTimeMs: this.ordersProcessor.getEnqueueVipTimeMs(),
                    enqueueNormalTimeMs: this.ordersProcessor.getEnqueueNormalTimeMs(),
                    aborting: this.ordersProcessor.isAborting(),
                },
                checks: {
                    queueResponsive: true,
                    hasFailedJobs: counts.failed > 0,
                    isStuck: counts.active > 0 && !isProcessing,
                }
            };

            if (counts.failed > 100) {
                (health as any).status = 'degraded';
            }
            if (counts.paused) {
                (health as any).status = 'paused';
            }

            return health;
        } catch (error) {
            return {
                status: 'unhealthy',
                timestamp: new Date().toISOString(),
                error: (error as Error).message,
                queue: {
                    connected: false,
                },
            };
        }
    }

    @Post('reset')
    async resetOrders() {
        await this.queueService.purgeAll();
        const res = await this.resetOrdersUseCase.execute();
        if (this.processRunRepo && (this.processRunRepo as any).resetAll) {
            try { await (this.processRunRepo as any).resetAll(); } catch {}
        }
        return res;
    }

    @Post('queue/pause')
    async pauseQueue(@Query('global', new DefaultValuePipe('true')) global: string) {
        await this.queueService.pauseQueue(global === 'true');
        return { paused: true, global: global === 'true' };
    }

    @Post('queue/resume')
    async resumeQueue(@Query('global', new DefaultValuePipe('true')) global: string) {
        await this.queueService.resumeQueue(global === 'true');
        return { resumed: true, global: global === 'true' };
    }

    @Post('queue/clean')
    async cleanQueue(@Query('state', new DefaultValuePipe('wait')) state: string, @Query('grace', new DefaultValuePipe('0')) grace: string) {
        const allowed = ['wait','active','delayed','completed','failed'];
        if (!allowed.includes(state)) return { error: 'state deve ser wait|active|delayed|completed|failed' };
        const removed = await this.queueService.clean(state as any, parseInt(grace, 10) || 0);
        return { removed, state };
    }

    @Post('queue/close')
    async closeQueue() {
        await this.queueService.closeQueue();
        return { closed: true };
    }

    @Get('queue/status')
    async queueStatus() {
        const counts = await this.queueService.getCounts();
        return counts;
    }

    @Get('queue/jobs')
    async queueJobs(@Query('types', new DefaultValuePipe('waiting')) types: string, @Query('start', new DefaultValuePipe('0')) start: string, @Query('end', new DefaultValuePipe('50')) end: string) {
        const typesArr = types.split(',') as any;
        const jobs = await this.queueService.getJobs(typesArr, parseInt(start, 10), parseInt(end, 10));
        return jobs.map(j => ({ id: j.id, name: j.name, data: j.data, state: j.finishedOn ? 'finished' : 'pending' }));
    }

    @Get('logs')
    async executionLogs(@Query('lines', new DefaultValuePipe(500), ParseIntPipe) lines: number) {
        const processLog = await this.logsUseCase.getProcessLog();
        const queueStatus = await this.queueService.getCounts();
        const logs = await this.logViewer?.getLogs(lines) || { logMessages: [], warnMessages: [], errorMessages: [] };

        const processedLines = (logs.logMessages || []).filter(l => l.includes('Pedido processado')).length;
        const vipProcessed = (logs.logMessages || []).filter(l => l.includes('enviado com prioridade')).length;
        const normalProcessed = (logs.logMessages || []).filter(l => l.includes('processado sem prioridade')).length;

        return {
            processLog,
            queueStatus,
            logs,
            quickStats: {
                processedLines,
                vipProcessed,
                normalProcessed,
            },
        };
    }
}