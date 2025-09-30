import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import { LogService } from '../../shared/logs/log.service';
import { OrdersProcessStateService } from '../../infrastructure/queue/services/orders-process-state.service';
import { LogsUseCase } from './logs.usecase';

@Injectable()
export class GenerateOrdersUseCase {
  private readonly MAX_ORDERS: number;

  constructor(
    @InjectQueue('orders-queue')
    private readonly ordersQueue: Queue,
    private readonly logService: LogService,
    private readonly state: OrdersProcessStateService,
    private readonly logs: LogsUseCase,
  ) {
    this.MAX_ORDERS = parseInt(process.env.MAX_ORDERS || '1500000', 10);
  }

  private async ensureQueueReady(timeoutMs = 3000): Promise<void> {
    try {
      const readyPromise = this.ordersQueue.isReady();
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error('Queue readiness timeout')),
          timeoutMs,
        ),
      );
      await Promise.race([readyPromise, timeout]);
    } catch (err: any) {
      this.logService.warn(
        `[GenerateOrdersUseCase] Queue not ready: ${err?.message ?? err}`,
      );
      throw err;
    }
  }

  async execute(quantity: number): Promise<string> {
    const phase = this.state.getPhase();

    if (!['IDLE', 'DONE', 'ERROR'].includes(phase)) {
      const msg = `[GenerateOrdersUseCase] Já existe um processamento em andamento (phase=${phase}). Cancele ou aguarde concluir.`;
      this.logService.warn(msg);
      throw new Error(msg);
    }

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

    this.logs.resetLogs();
    this.logs.setTotalQuantityTarget(quantity);

    this.logService.log(
      `[GenerateOrdersUseCase] Iniciando job master generateOrders quantity=${quantity} (phase atual=${phase})`,
    );

    try {
      await this.ensureQueueReady(3000);

      const addPromise = this.ordersQueue.add(
        'generateOrders',
        { quantity },
        {
          removeOnComplete: true,
          jobId: `generate-${Date.now()}`,
          priority: 1,
        },
      );

      const timeout = new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error('Timeout ao adicionar job na fila')),
          5000,
        ),
      );

      await Promise.race([addPromise, timeout]);

      this.logService.log(
        '[GenerateOrdersUseCase] Job "generateOrders" enfileirado com sucesso.',
      );

      return 'Processo iniciado: geração + processamento em duas fases (VIP -> NORMAL).';
    } catch (err: any) {
      this.logService.error(
        `[GenerateOrdersUseCase] Erro ao enfileirar job: ${err?.message ?? err}`,
      );
      throw err;
    }
  }
}
