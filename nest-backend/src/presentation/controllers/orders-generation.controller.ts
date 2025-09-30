import {
  Controller,
  Post,
  Query,
  DefaultValuePipe,
  ParseIntPipe,
} from '@nestjs/common';
import { GenerateOrdersUseCase } from '../../application/use-cases/generate-orders.usecase';
import { CancelProcessUseCase } from '../../application/use-cases/cancel-process.usecase';
import { ResetOrdersUseCase } from '../../application/use-cases/reset-orders.usecase';
import { OrdersQueueService } from '../../infrastructure/queue/services/orders-queue.service';
import { OrdersProcessStateService } from '../../infrastructure/queue/services/orders-process-state.service';
import { Inject } from '@nestjs/common';
import type { IProcessRunRepository } from '../../domain/repositories/process-run.repository';

@Controller('pedidos')
export class OrdersGenerationController {
  constructor(
    private readonly generateOrdersUseCase: GenerateOrdersUseCase,
    private readonly cancelProcessUseCase: CancelProcessUseCase,
    private readonly resetOrdersUseCase: ResetOrdersUseCase,
    private readonly queueService: OrdersQueueService,
    private readonly state: OrdersProcessStateService,
    @Inject('IProcessRunRepository')
    private readonly processRunRepo?: IProcessRunRepository,
  ) {}

  @Post('generate')
  async generateOrders(
    @Query('quantity', new DefaultValuePipe(1000000), ParseIntPipe)
    quantity: number,
  ) {
    const msg = await this.generateOrdersUseCase.execute(quantity);
    return { message: msg };
  }

  @Post('cancel')
  async cancel(
    @Query('purge', new DefaultValuePipe('true')) purge: string,
    @Query('removePending', new DefaultValuePipe('true')) removePending: string,
    @Query('resetLogs', new DefaultValuePipe('false')) resetLogs: string,
  ) {
    return this.cancelProcessUseCase.execute({
      purge: purge === 'true',
      removePending: removePending === 'true',
      resetLogs: resetLogs === 'true',
    });
  }

  @Post('reset')
  async resetOrders() {
    await this.queueService.purgeAll();
    const res = await this.resetOrdersUseCase.execute();
    if (this.processRunRepo && (this.processRunRepo as any).resetAll) {
      try {
        await (this.processRunRepo as any).resetAll();
      } catch {}
    }
    this.state.resetAll();
    return res;
  }
}
