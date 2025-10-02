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
            host: config.get<string>('REDIS_HOST', 'localhost'),
            port: config.get<number>('REDIS_PORT', 6379),
            password: config.get<string>('REDIS_PASSWORD'),
            db: config.get<number>('REDIS_DB', 0),
            // Modern scaling: Connection pooling for better performance
            maxRetriesPerRequest: null,
            retryDelayOnFailover: 100,
            enableReadyCheck: true,
            // Connection sharing between queues
            lazyConnect: true,
            // Better error handling
            commandTimeout: 5000,
            connectTimeout: 60000,
            family: 4,
          },
          // Modern scaling: Default job options for better reliability
          defaultJobOptions: {
            removeOnComplete: {
              count: 1000, // Increased for better monitoring
              age: 24 * 3600, // Keep completed jobs for 24 hours
            },
            removeOnFail: {
              count: 500,
              age: 7 * 24 * 3600, // Keep failed jobs for 7 days for analysis
            },
            attempts: 3, // Increased retry attempts
            backoff: {
              type: 'exponential',
              delay: 2000,
            },
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
            age: 24 * 3600,
          },
          removeOnFail: {
            count: 200,
            age: 7 * 24 * 3600,
          },
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
          priority: 2,
        },
      },
      {
        name: 'orders-control',
        defaultJobOptions: {
          removeOnComplete: false,
          removeOnFail: false,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 1000,
          },
          priority: 1,
          // Control queue doesn't need rate limiting
        },
      },
    ),
  ],
  exports: [BullModule],
})
export class QueueModule {}
