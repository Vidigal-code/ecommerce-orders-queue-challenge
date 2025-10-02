import { Injectable, OnModuleInit } from '@nestjs/common';
import { ProcessStateRepository } from './process-state.repository';
import { OrdersProcessStateService } from '../queue/services/orders-process-state.service';
import { Phase } from '../queue/types/phase.types';

@Injectable()
export class ProcessStateBootstrap implements OnModuleInit {
  constructor(
    private readonly repo: ProcessStateRepository,
    private readonly mem: OrdersProcessStateService,
  ) {}

  async onModuleInit() {
    try {
      const persisted = await this.repo.load();
      if (persisted) {
        const allowed: Phase[] = [
          'IDLE',
          'GENERATING',
          'ENQUEUE_VIP',
          'WAITING_VIP_DRAIN',
          'ENQUEUE_NORMAL',
          'WAITING_NORMAL_DRAIN',
          'DONE',
          'ABORTED',
          'ERROR',
        ];
        const phase = allowed.includes(persisted.phase as Phase)
          ? (persisted.phase as Phase)
          : 'IDLE';

        this.mem.setPhase(phase);
        this.mem.setAborted(!!persisted.aborted);
        this.mem.setActiveGenerateJobId(persisted.activeGenerateJobId || null);
      }
    } catch (e) {}
  }
}
