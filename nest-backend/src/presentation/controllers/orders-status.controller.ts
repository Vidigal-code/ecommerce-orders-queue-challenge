import {
  Controller,
  Get,
  Query,
  DefaultValuePipe,
  ParseIntPipe,
  Inject,
} from '@nestjs/common';
import { LogsUseCase } from '../../application/use-cases/logs.usecase';
import { OrdersQueueService } from '../../infrastructure/queue/services/orders-queue.service';
import { OrdersProcessStateService } from '../../infrastructure/queue/services/orders-process-state.service';
import type { IProcessRunRepository } from '../../domain/repositories/process-run.repository';
import { OrdersStatusDto } from '../dtos/orders-status.dto';
import { LogViewer } from '../../shared/logs/log.viewer';
import { Phase } from '../../infrastructure/queue/types/phase.types';

@Controller('orders')
export class OrdersStatusController {
  constructor(
    private readonly logsUseCase: LogsUseCase,
    private readonly queueService: OrdersQueueService,
    private readonly state: OrdersProcessStateService,
    private readonly logViewer: LogViewer,
    @Inject('IProcessRunRepository')
    private readonly processRunRepo?: IProcessRunRepository,
  ) {}

  @Get()
  async getOrdersStatus(): Promise<OrdersStatusDto> {
    const processLog = await this.logsUseCase.getProcessLog();
    const latest = this.processRunRepo
      ? await this.processRunRepo.findLatest()
      : null;

    const phase: Phase =
      (processLog.phase as Phase | undefined) || this.state.getPhase();

    return {
      generationTimeMs: processLog.generationTimeMs ?? 0,
      enqueueVipTimeMs:
        processLog.enqueueVipTimeMs ?? this.state.getEnqueueVipTimeMs() ?? 0,
      enqueueNormalTimeMs:
        processLog.enqueueNormalTimeMs ??
        this.state.getEnqueueNormalTimeMs() ??
        0,
      processing: {
        vip: {
          start: processLog.startVIP ? processLog.startVIP.toISOString() : null,
          end: processLog.endVIP ? processLog.endVIP.toISOString() : null,
          timeMs: processLog.processingTimeVIPMs ?? 0,
          count: processLog.totalProcessedVIP ?? 0,
        },
        normal: {
          start: processLog.startNormal
            ? processLog.startNormal.toISOString()
            : null,
          end: processLog.endNormal ? processLog.endNormal.toISOString() : null,
          timeMs: processLog.processingTimeNormalMs ?? 0,
          count: processLog.totalProcessedNormal ?? 0,
        },
      },
      totalTimeMs: processLog.totalTimeMs ?? 0,
      counts: {
        vip: processLog.totalProcessedVIP ?? 0,
        normal: processLog.totalProcessedNormal ?? 0,
      },
      phase,
      lastRunId: latest?.runId,
      throughput: {
        vip: processLog.throughput.vip ?? 0,
        normal: processLog.throughput.normal ?? 0,
        overall: processLog.throughput.overall ?? 0,
      },
      eta: {
        estimatedMs: processLog.eta.estimatedMs,
        progressPercent: processLog.eta.progressPercent,
      },
      progress: {
        target: processLog.target ?? 0,
        generated: processLog.generated ?? 0,
        processedTotal:
          (processLog.totalProcessedVIP ?? 0) +
          (processLog.totalProcessedNormal ?? 0),
      },
    };
  }

  @Get('logs')
  async executionLogs(
    @Query('lines', new DefaultValuePipe(500), ParseIntPipe) lines: number,
  ) {
    const processLog = await this.logsUseCase.getProcessLog();
    const queueStatus = await this.queueService.getCounts();
    const logs = (await this.logViewer?.getLogs(lines)) || {
      logMessages: [],
      warnMessages: [],
      errorMessages: [],
    };

    const vipProcessed = processLog.totalProcessedVIP ?? 0;
    const normalProcessed = processLog.totalProcessedNormal ?? 0;

    return {
      processLog,
      queueStatus,
      logs,
      quickStats: {
        vipProcessed,
        normalProcessed,
        totalProcessed: vipProcessed + normalProcessed,
      },
    };
  }

  @Get('health/ready')
  async readinessCheck() {
    try {
      // Basic readiness check - ensure the app can respond
      return {
        status: 'ready',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
      };
    } catch (error) {
      return {
        status: 'not ready',
        timestamp: new Date().toISOString(),
        error: (error as Error).message,
      };
    }
  }

  @Get('health/queue')
  async queueHealthCheck() {
    try {
      const counts = await this.queueService.getCounts();
      const phase = this.state.getPhase();
      const isProcessing = [
        'GENERATING',
        'ENQUEUE_VIP',
        'WAITING_VIP_DRAIN',
        'ENQUEUE_NORMAL',
        'WAITING_NORMAL_DRAIN',
      ].includes(phase);

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
          phase,
          isProcessing,
          enqueueVipTimeMs: this.state.getEnqueueVipTimeMs(),
          enqueueNormalTimeMs: this.state.getEnqueueNormalTimeMs(),
          aborting: this.state.isAborting(),
        },
        checks: {
          queueResponsive: true,
          hasFailedJobs: counts.failed > 0,
          isStuck: counts.active > 0 && !isProcessing,
          aborted: phase === 'ABORTED',
        },
      };

      if (counts.failed > 100) (health as any).status = 'degraded';
      if (counts.paused) (health as any).status = 'paused';
      if (phase === 'ABORTED') (health as any).status = 'aborted';
      if (phase === 'ERROR') (health as any).status = 'error';

      return health;
    } catch (error) {
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: (error as Error).message,
        queue: { connected: false },
      };
    }
  }
}
