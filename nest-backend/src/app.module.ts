import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { RedisModule } from './infrastructure/queue/modules/redis.module';

import { OrdersGenerationController } from './presentation/controllers/orders-generation.controller';
import { OrdersStatusController } from './presentation/controllers/orders-status.controller';
import { OrdersQueueController } from './presentation/controllers/orders-queue.controller';

import { OrderTypeOrmRepository } from './infrastructure/database/typeorm/repositorys/order.typeorm.repository';
import { ProcessRunTypeOrmRepository } from './infrastructure/database/typeorm/repositorys/process-run.typeorm.repository';

import { GenerateOrdersUseCase } from './application/use-cases/generate-orders.usecase';
import { LogsUseCase } from './application/use-cases/logs.usecase';
import { ResetOrdersUseCase } from './application/use-cases/reset-orders.usecase';
import { CancelProcessUseCase } from './application/use-cases/cancel-process.usecase';

import { OrdersQueueService } from './infrastructure/queue/services/orders-queue.service';
import { OrdersGenerationProcessor } from './infrastructure/queue/processors/orders-generation.processor';
import { OrdersWorkerProcessor } from './infrastructure/queue/processors/orders-worker.processor';
import { OrdersProcessStateService } from './infrastructure/queue/services/orders-process-state.service';

import { LogService } from './shared/logs/log.service';
import { LogViewer } from './shared/logs/log.viewer';
import { AsyncLogService } from './shared/logs/async-log.service';
import { DatabaseModule } from './infrastructure/database/modules/database.module';
import { EventsModule } from './infrastructure/websocket/events.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    RedisModule,
    EventsModule,
  ],
  controllers: [
    OrdersGenerationController,
    OrdersStatusController,
    OrdersQueueController,
  ],
  providers: [
    LogService,
    AsyncLogService,
    LogViewer,
    OrderTypeOrmRepository,
    ProcessRunTypeOrmRepository,
    {
      provide: 'IOrderRepository',
      useClass: OrderTypeOrmRepository,
    },
    {
      provide: 'IProcessRunRepository',
      useExisting: ProcessRunTypeOrmRepository,
    },
    GenerateOrdersUseCase,
    LogsUseCase,
    ResetOrdersUseCase,
    CancelProcessUseCase,
    OrdersQueueService,
    OrdersProcessStateService,
    OrdersGenerationProcessor,
    OrdersWorkerProcessor,
    // EventsGateway, // Removed - WebSocket gateways are auto-discovered
  ],
})
export class AppModule {}
