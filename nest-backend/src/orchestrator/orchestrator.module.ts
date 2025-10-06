import { Module } from '@nestjs/common';
import { OrchestratorService } from './orchestrator.service';
import { OrchestratorController } from './orchestrator.controller';
import { OrdersModule } from '../orders/orders.module';
import { QueueModule } from '../queue/queue.module';
import { MetricsModule } from '../metrics/metrics.module';
import { WebsocketModule } from '../websocket/websocket.module';

@Module({
  imports: [OrdersModule, QueueModule, MetricsModule, WebsocketModule],
  controllers: [OrchestratorController],
  providers: [OrchestratorService],
})
export class OrchestratorModule {}