import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { OrdersModule } from './orders/orders.module';
import { QueueModule } from './queue/queue.module';
import { MetricsModule } from './metrics/metrics.module';
import { OrchestratorModule } from './orchestrator/orchestrator.module';
import { WebsocketModule } from './websocket/websocket.module';

@Module({
  imports: [
    DatabaseModule,
    OrdersModule,
    QueueModule,
    MetricsModule,
    OrchestratorModule,
    WebsocketModule,
  ],
})
export class AppModule {}