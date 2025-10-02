import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';

import { OrderTypeOrmEntity } from '../typeorm/entitys/order.typeorm.entity';
import { ProcessRunTypeOrmEntity } from '../typeorm/entitys/process-run.typeorm.entity';
import { ProcessStateEntity } from '../../state/process-state.entity';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'mongodb',
        url: config.get<string>('MONGO_URI'),
        database: 'ecommerce',
        entities: [
          OrderTypeOrmEntity,
          ProcessRunTypeOrmEntity,
          ProcessStateEntity,
        ],
        synchronize: false,
      }),
    }),
    TypeOrmModule.forFeature([
      OrderTypeOrmEntity,
      ProcessRunTypeOrmEntity,
      ProcessStateEntity,
    ]),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
