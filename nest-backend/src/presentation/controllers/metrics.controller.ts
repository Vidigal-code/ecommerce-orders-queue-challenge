import { Controller, Get } from '@nestjs/common';
import { MetricsService } from '../../infrastructure/metrics/metrics.service';

@Controller()
export class MetricsController {
  constructor(private readonly metrics: MetricsService) {}

  @Get('metrics')
  async metricsEndpoint() {
    return await this.metrics.metricsText();
  }

  @Get('health/live')
  live() {
    return { status: 'alive', ts: new Date().toISOString() };
  }

  @Get('health/ready')
  ready() {
    return { status: 'ready', ts: new Date().toISOString() };
  }
}
