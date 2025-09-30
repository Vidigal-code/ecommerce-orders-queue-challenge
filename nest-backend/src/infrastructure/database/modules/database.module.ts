import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { ProcessRunTypeOrmEntity } from '../typeorm/entitys/process-run.typeorm.entity';
import { OrderTypeOrmEntity } from '../typeorm/entitys/order.typeorm.entity';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'mongodb',
        url: config.get<string>('MONGO_URI'),
        database: 'ecommerce',
        entities: [OrderTypeOrmEntity, ProcessRunTypeOrmEntity],
        synchronize: false,
      }),
    }),
    TypeOrmModule.forFeature([OrderTypeOrmEntity, ProcessRunTypeOrmEntity]),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
