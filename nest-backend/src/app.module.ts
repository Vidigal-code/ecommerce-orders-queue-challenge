import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { QueueModule } from './infrastructure/queue/modules/queue.module';
import { DatabaseModule } from './infrastructure/database/modules/database.module';

import { OrdersGenerationController } from './presentation/controllers/orders-generation.controller';
import { OrdersStatusController } from './presentation/controllers/orders-status.controller';
import { OrdersQueueController } from './presentation/controllers/orders-queue.controller';
import { MetricsController } from './presentation/controllers/metrics.controller';
import { ProcessRunsController } from './presentation/controllers/process-runs.controller';
import { DiagnosticsController } from './presentation/controllers/diagnostics.controller';
import { OrdersController } from './presentation/controllers/orders.controller';

import { OrderTypeOrmRepository } from './infrastructure/database/typeorm/repositorys/order.typeorm.repository';
import { ProcessRunTypeOrmRepository } from './infrastructure/database/typeorm/repositorys/process-run.typeorm.repository';

import { GenerateOrdersUseCase } from './application/use-cases/generate-orders.usecase';
import { LogsUseCase } from './application/use-cases/logs.usecase';
import { ResetOrdersUseCase } from './application/use-cases/reset-orders.usecase';
import { CancelProcessUseCase } from './application/use-cases/cancel-process.usecase';

import { OrdersQueueService } from './infrastructure/queue/services/orders-queue.service';
import { OrdersGenerationProcessor } from './infrastructure/queue/processors/orders-generation.processor';
import { OrdersWorkerProcessor } from './infrastructure/queue/processors/orders-worker.processor';
import { Worker } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import { OrdersProcessStateService } from './infrastructure/queue/services/orders-process-state.service';

import { AsyncLogService } from './shared/logs/async-log.service';
import { LogViewer } from './shared/logs/log.viewer';

import { ProcessStateRepository } from './infrastructure/state/process-state.repository';
import { MetricsModule } from './infrastructure/metrics/metrics.module';
import { validateConfig } from './config/config.schema';
import { ProcessStateBootstrap } from './infrastructure/state/process-state.bootstrap';
import { QueueShutdownProvider } from './infrastructure/queue/shutdown/queue-shutdown.provider';
import { EventsModule } from './infrastructure/websocket/events.module';
import { TimingService } from './shared/timing/timing.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateConfig,
    }),
    DatabaseModule,
    QueueModule,
    MetricsModule,
    EventsModule,
  ],
  controllers: [
    OrdersGenerationController,
    OrdersStatusController,
    OrdersQueueController,
    MetricsController,
    ProcessRunsController,
    DiagnosticsController,
    OrdersController,
  ],
  providers: [
    AsyncLogService,
    LogViewer,
    OrderTypeOrmRepository,
    ProcessRunTypeOrmRepository,
    ProcessStateRepository,
    ProcessStateBootstrap,
    QueueShutdownProvider,
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
    TimingService,
    {
      provide: 'ORDERS_QUEUE_WORKER',
      inject: [OrdersWorkerProcessor, ConfigService],
      useFactory: (
        workerHost: OrdersWorkerProcessor,
        config: ConfigService,
      ) => {
        const connection = {
          host: config.get<string>('REDIS_HOST'),
          port: config.get<number>('REDIS_PORT'),
          maxRetriesPerRequest: null as any,
          enableReadyCheck: true,
          commandTimeout: 20000 as any,
          connectTimeout: 60000 as any,
        } as any;
        const worker = new Worker(
          'orders-queue',
          async (job) => workerHost.process(job as any),
          {
            connection,
            concurrency: parseInt(
              process.env.ORDERS_QUEUE_CONCURRENCY || '10',
              10,
            ),
          },
        );
        worker.on('error', (err) => {
          (workerHost as any).log?.error?.(
            '[AppModule] Worker error: ' + err?.message,
          );
        });
        return worker;
      },
    },
  ],
})
export class AppModule {}
