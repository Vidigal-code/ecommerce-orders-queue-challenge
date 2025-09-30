import { Injectable, Inject } from '@nestjs/common';
import { LogsUseCase } from './logs.usecase';
import * as orderRepository from '../../domain/repositories/order.repository';
import type { IProcessRunRepository } from '../../domain/repositories/process-run.repository';

@Injectable()
export class ResetOrdersUseCase {
  constructor(
    @Inject('IOrderRepository')
    private readonly orderRepo: orderRepository.IOrderRepository,
    private readonly logsUseCase: LogsUseCase,
    @Inject('IProcessRunRepository')
    private readonly processRunRepo?: IProcessRunRepository,
  ) {}

  async execute(options?: {
    resetRuns?: boolean;
    clearPendingOnly?: boolean;
  }): Promise<{ message: string }> {
    if (options?.clearPendingOnly) {
      await this.orderRepo.deletePending();
      return {
        message: 'Pedidos pendentes removidos. Processo não foi resetado.',
      };
    }

    await this.orderRepo.reset();
    this.logsUseCase.resetLogs();
    if (options?.resetRuns && this.processRunRepo) {
      try {
        await this.processRunRepo.resetAll();
      } catch {}
    }
    return {
      message:
        'Banco de pedidos resetado com sucesso. Logs apagados.' +
        (options?.resetRuns ? ' Histórico de execuções limpo.' : ''),
    };
  }
}
