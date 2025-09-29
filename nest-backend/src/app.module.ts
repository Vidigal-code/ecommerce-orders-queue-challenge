import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { OrderTypeOrmEntity } from './infrastructure/database/typeorm/order.typeorm.entity';
import { ProcessRunTypeOrmEntity } from './infrastructure/database/typeorm/process-run.typeorm.entity';
import { OrdersController } from './presentation/controllers/orders.controller';
import { OrderTypeOrmRepository } from './infrastructure/database/typeorm/order.typeorm.repository';
import { ProcessRunTypeOrmRepository } from './infrastructure/database/typeorm/process-run.typeorm.repository';
import { GenerateOrdersUseCase } from './application/use-cases/generate-orders.usecase';
import { LogsUseCase } from './application/use-cases/logs.usecase';
import { ResetOrdersUseCase } from './application/use-cases/reset-orders.usecase';
import { OrdersQueueService } from './infrastructure/queue/orders-queue.service';
import { OrdersProcessor } from './infrastructure/queue/orders.processor';
import { LogService } from './shared/logs/log.service';
import { LogViewer } from './shared/logs/log.viewer';
import { CancelProcessUseCase } from './application/use-cases/cancel-process.usecase';

@Module({
    imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        TypeOrmModule.forRoot({
            type: 'mongodb',
            url: process.env.MONGO_URI,
            database: 'ecommerce',
            entities: [OrderTypeOrmEntity, ProcessRunTypeOrmEntity],
            synchronize: true,
        }),
        TypeOrmModule.forFeature([OrderTypeOrmEntity, ProcessRunTypeOrmEntity]),
        BullModule.forRoot({
            redis: {
                host: process.env.REDIS_HOST,
                port: parseInt(process.env.REDIS_PORT || '6379', 10),
            },
        }),
        BullModule.registerQueue({
            name: 'orders-queue',
        }),
    ],
    controllers: [OrdersController],
    providers: [
        LogService,
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
        OrdersQueueService,
        OrdersProcessor,
        CancelProcessUseCase,
    ],
})
export class AppModule {}