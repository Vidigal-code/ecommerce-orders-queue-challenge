import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        redis: {
          host: config.get<string>('REDIS_HOST'),
          port: Number(config.get<number>('REDIS_PORT') ?? 6379),
        },
      }),
    }),
    BullModule.registerQueue({
      name: 'orders-queue',
    }),
  ],
  exports: [BullModule],
})
export class RedisModule {}
