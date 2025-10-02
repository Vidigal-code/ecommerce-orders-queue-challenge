import { Controller, Get } from '@nestjs/common';
import { LogsUseCase } from '../../application/use-cases/logs.usecase';
import { TimingService } from '../../shared/timing/timing.service';
import { OrdersProcessStateService } from '../../infrastructure/queue/services/orders-process-state.service';
import * as orderRepository from '../../domain/repositories/order.repository';
import { Inject } from '@nestjs/common';

@Controller('orders')
export class OrdersController {
  constructor(
    private readonly logs: LogsUseCase,
    private readonly timing: TimingService,
    private readonly state: OrdersProcessStateService,
    @Inject('IOrderRepository')
    private readonly orderRepo: orderRepository.IOrderRepository,
  ) {}

  @Get()
  async getOrdersStatus() {
    const processLog = await this.logs.getProcessLog();
    const windows = this.timing.snapshotAll();
    const vipProcessed = processLog.totalProcessedVIP;
    const normalProcessed = processLog.totalProcessedNormal;
    return {
      contractVersion: 2,
      phase: processLog.phase || 'IDLE',
      target: processLog.target,
      generated: processLog.generated,
      generationTimeMs: processLog.generationTimeMs,
      enqueueVipTimeMs: processLog.enqueueVipTimeMs,
      enqueueNormalTimeMs: processLog.enqueueNormalTimeMs,
      processing: {
        vip: {
          timeMs: processLog.processingTimeVIPMs,
          start: processLog.startVIP,
          end: processLog.endVIP,
          count: vipProcessed,
        },
        normal: {
          timeMs: processLog.processingTimeNormalMs,
          start: processLog.startNormal,
          end: processLog.endNormal,
          count: normalProcessed,
        },
      },
      totalTimeMs: processLog.totalTimeMs,
      wallClockElapsedMs: processLog.wallClockMs,
      counts: {
        vip: vipProcessed,
        normal: normalProcessed,
        total: vipProcessed + normalProcessed,
      },
      progress: {
        target: processLog.target,
        generated: processLog.generated,
        processedTotal: vipProcessed + normalProcessed,
      },
      throughput: processLog.throughput,
      eta: processLog.eta,
      highRes: windows,
      state: {
        memoryPhase: this.state.getPhase(),
        aborting: this.state.isAborting(),
        hasActiveGeneration: this.state.hasActiveGeneration(),
      },
      timestamp: Date.now(),
    };
  }
}
