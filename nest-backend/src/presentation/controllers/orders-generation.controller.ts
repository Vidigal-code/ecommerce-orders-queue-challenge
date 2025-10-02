import {
  Controller,
  Post,
  Get,
  Query,
  DefaultValuePipe,
  ParseIntPipe,
  Inject,
  ConflictException,
} from '@nestjs/common';
import { GenerateOrdersUseCase } from '../../application/use-cases/generate-orders.usecase';
import { CancelProcessUseCase } from '../../application/use-cases/cancel-process.usecase';
import { ResetOrdersUseCase } from '../../application/use-cases/reset-orders.usecase';
import { OrdersQueueService } from '../../infrastructure/queue/services/orders-queue.service';
import { OrdersProcessStateService } from '../../infrastructure/queue/services/orders-process-state.service';
import type { IProcessRunRepository } from '../../domain/repositories/process-run.repository';
import { ProcessStateRepository } from '../../infrastructure/state/process-state.repository';

@Controller('pedidos')
export class OrdersGenerationController {
  constructor(
    private readonly generateOrdersUseCase: GenerateOrdersUseCase,
    private readonly cancelProcessUseCase: CancelProcessUseCase,
    private readonly resetOrdersUseCase: ResetOrdersUseCase,
    private readonly queueService: OrdersQueueService,
    private readonly state: OrdersProcessStateService,
    private readonly processStateRepo: ProcessStateRepository,
    @Inject('IProcessRunRepository')
    private readonly processRunRepo?: IProcessRunRepository,
  ) {}

  @Post('generate')
  async generateOrders(
    @Query('quantity', new DefaultValuePipe(1000000), ParseIntPipe)
    quantity: number,
    @Query('force', new DefaultValuePipe('false')) force: string,
    @Query('autoForceIfStale', new DefaultValuePipe('true'))
    autoForceIfStale: string,
    @Query('returnOnActive', new DefaultValuePipe('true'))
    returnOnActive: string,
  ) {
    const result = await this.generateOrdersUseCase.execute(quantity, {
      force: force === 'true',
      autoForceIfStale: autoForceIfStale === 'true',
      returnOnActive: returnOnActive === 'true',
    });
    if (
      result.message?.startsWith('Processamento já em andamento') ||
      result.message?.startsWith('Processo já em andamento')
    ) {
      throw new ConflictException(result.message);
    }
    if (result.message?.includes('já foi enfileirada')) {
      throw new ConflictException(result.message);
    }
    return result;
  }

  @Get('generate')
  async generateOrdersGet(
    @Query('quantity', new DefaultValuePipe(1000000), ParseIntPipe)
    quantity: number,
    @Query('force', new DefaultValuePipe('false')) force: string,
    @Query('autoForceIfStale', new DefaultValuePipe('true'))
    autoForceIfStale: string,
    @Query('returnOnActive', new DefaultValuePipe('true'))
    returnOnActive: string,
  ) {
    const result = await this.generateOrdersUseCase.execute(quantity, {
      force: force === 'true',
      autoForceIfStale: autoForceIfStale === 'true',
      returnOnActive: returnOnActive === 'true',
    });
    if (
      result.message?.startsWith('Processamento já em andamento') ||
      result.message?.startsWith('Processo já em andamento')
    ) {
      throw new ConflictException(result.message);
    }
    if (result.message?.includes('já foi enfileirada')) {
      throw new ConflictException(result.message);
    }
    return { ...result, method: 'GET' };
  }

  @Post('cancel')
  async cancel(
    @Query('purge', new DefaultValuePipe('true')) purge: string,
    @Query('removePending', new DefaultValuePipe('true')) removePending: string,
    @Query('resetLogs', new DefaultValuePipe('false')) resetLogs: string,
    @Query('waitTimeoutMs') waitTimeoutMs?: string,
    @Query('pollIntervalMs') pollIntervalMs?: string,
    @Query('resetPhaseToIdle', new DefaultValuePipe('true'))
    resetPhaseToIdle?: string,
  ) {
    const waitTimeout =
      waitTimeoutMs != null ? parseInt(waitTimeoutMs, 10) : undefined;
    const pollInterval =
      pollIntervalMs != null ? parseInt(pollIntervalMs, 10) : undefined;

    return this.cancelProcessUseCase.execute({
      purge: purge === 'true',
      removePending: removePending === 'true',
      resetLogs: resetLogs === 'true',
      waitTimeoutMs: waitTimeout,
      pollIntervalMs: pollInterval,
      resetPhaseToIdle: resetPhaseToIdle === 'true',
    });
  }

  @Post('reset')
  async resetOrders() {
    await this.queueService.purgeAll();
    const res = await this.resetOrdersUseCase.execute({ resetRuns: true });
    if (this.processRunRepo && (this.processRunRepo as any).resetAll) {
      try {
        await (this.processRunRepo as any).resetAll();
      } catch {}
    }
    this.state.resetAll();
    try {
      await this.processStateRepo.reset();
    } catch {}
    return res;
  }
}
