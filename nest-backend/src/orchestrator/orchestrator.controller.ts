import { Controller, Get } from '@nestjs/common';
import { OrchestratorService } from './orchestrator.service';

@Controller('orchestrator')
export class OrchestratorController {
  constructor(private readonly orchestratorService: OrchestratorService) {}

  @Get('orders')
  async getOrdersStatus() {
    return await this.orchestratorService.getOrdersStatus();
  }
}