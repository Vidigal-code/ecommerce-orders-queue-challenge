import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MongoRepository } from 'typeorm';
import { OrderTypeOrmEntity } from '../entitys/order.typeorm.entity';
import { IOrderRepository } from '../../../../domain/repositories/order.repository';
import { Order, Priority } from '../../../../domain/entities/order.entity';
import { LogService } from '../../../../shared/logs/log.service';

@Injectable()
export class OrderTypeOrmRepository implements IOrderRepository {
  constructor(
    @InjectRepository(OrderTypeOrmEntity)
    private readonly repo: MongoRepository<OrderTypeOrmEntity>,
    private readonly logService: LogService,
  ) {}

  async save(order: Order): Promise<Order> {
    return await this.repo.save(order as any);
  }

  async bulkSave(orders: Order[]): Promise<void> {
    if (!orders.length) return;
    try {
      await this.repo.insertMany(orders as any[], { ordered: false });
    } catch (e: any) {
      this.logService.warn(
        '[OrderTypeOrmRepository] Erro no bulkSave: ' + (e?.message ?? e),
      );
      if (e.code !== 11000) throw e;
    }
  }

  async findByPriority(priority: Priority): Promise<Order[]> {
    return await this.repo.find({ where: { priority } });
  }

  async findAll(): Promise<Order[]> {
    return await this.repo.find();
  }

  async update(order: Order): Promise<Order> {
    try {
      const updateDoc: any = { ...order };
      delete updateDoc._id;
      await (this.repo as any).updateOne(
        { id: order.id },
        { $set: updateDoc },
        { upsert: true },
      );
      const updated = await this.repo.findOne({ where: { id: order.id } });
      if (!updated) {
        return await this.repo.save(order as any);
      }
      return updated as unknown as Order;
    } catch (err: any) {
      this.logService.error(
        `[OrderTypeOrmRepository] Erro no update do pedido ${order?.id}: ${err?.message ?? err}`,
      );
      throw err;
    }
  }

  async reset(): Promise<void> {
    await this.repo.deleteMany({});
  }

  async countByPriority(priority: Priority): Promise<number> {
    return await this.repo.count({ where: { priority } });
  }

  async countProcessedByPriority(priority: Priority): Promise<number> {
    return await this.repo.count({
      where: {
        priority,
        status: { $ne: 'pendente' } as any,
      },
    });
  }

  async deletePending(): Promise<number> {
    const res: any = await (this.repo as any).deleteMany({
      status: 'pendente',
    });
    return res?.deletedCount || 0;
  }

  async *iterateByPriority(
    priority: Priority,
    batchSize = 10_000,
  ): AsyncGenerator<Order[], void> {
    const native = (this.repo as any).find({
      where: { priority },
      order: { createdAt: 'ASC' },
    });

    if (Array.isArray(native)) {
      for (let i = 0; i < native.length; i += batchSize) {
        yield native.slice(i, i + batchSize);
      }
      return;
    }

    const collection = (this.repo as any).mongodbCollection;
    if (!collection) {
      const all = await this.findByPriority(priority);
      for (let i = 0; i < all.length; i += batchSize) {
        yield all.slice(i, i + batchSize);
      }
      return;
    }

    const cursor = collection.find({ priority });
    let batch: Order[] = [];
    while (await cursor.hasNext()) {
      const doc = await cursor.next();
      if (doc) {
        batch.push(doc as Order);
        if (batch.length >= batchSize) {
          yield batch;
          batch = [];
        }
      }
    }
    if (batch.length) {
      yield batch;
    }
  }
}
