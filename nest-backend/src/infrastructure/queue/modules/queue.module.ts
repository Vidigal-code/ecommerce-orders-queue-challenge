import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        return {
          connection: {
            host: config.get<string>('REDIS_HOST'),
            port: config.get<number>('REDIS_PORT'),
          },
        };
      },
    }),
    BullModule.registerQueue(
      {
        name: 'orders-queue',
        defaultJobOptions: {
          removeOnComplete: {
            count: 500,
          },
          removeOnFail: {
            count: 200,
          },
          attempts: 1,
          priority: 2,
        },
      },
      {
        name: 'orders-control',
        defaultJobOptions: {
          removeOnComplete: false,
          removeOnFail: false,
          attempts: 1,
          priority: 1,
        },
      },
    ),
  ],
  exports: [BullModule],
})
export class QueueModule {}
