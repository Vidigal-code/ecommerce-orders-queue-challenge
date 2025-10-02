import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MongoRepository } from 'typeorm';
import { Filter, FilterOperators, OptionalUnlessRequiredId } from 'mongodb';
import { OrderTypeOrmEntity } from '../entitys/order.typeorm.entity';
import { IOrderRepository } from '../../../../domain/repositories/order.repository';
import { Order, Priority } from '../../../../domain/entities/order.entity';
import { AsyncLogService } from '../../../../shared/logs/async-log.service';

@Injectable()
export class OrderTypeOrmRepository implements IOrderRepository {
  constructor(
    @InjectRepository(OrderTypeOrmEntity)
    private readonly repo: MongoRepository<OrderTypeOrmEntity>,
    private readonly log: AsyncLogService,
  ) {}

  async save(order: Order): Promise<Order> {
    const entity = this.repo.create(order as Partial<OrderTypeOrmEntity>);
    const saved = await this.repo.save(entity);
    return saved as unknown as Order;
  }

  async bulkSave(orders: Order[]): Promise<void> {
    if (!orders.length) return;
    try {
      const payload = orders.map(
        (order) =>
          this.repo.create(
            order as Partial<OrderTypeOrmEntity>,
          ) as OptionalUnlessRequiredId<OrderTypeOrmEntity>,
      );
      await this.repo.insertMany(payload, { ordered: false });
    } catch (e: any) {
      this.log.warn(
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
      const updateDoc: Partial<OrderTypeOrmEntity> = { ...order };
      delete (updateDoc as { _id?: unknown })._id;
      await this.repo.updateOne(
        { id: order.id },
        { $set: updateDoc },
        { upsert: true },
      );
      const updated = await this.repo.findOne({ where: { id: order.id } });
      if (!updated) {
        const entity = this.repo.create(order as Partial<OrderTypeOrmEntity>);
        const saved = await this.repo.save(entity);
        return saved as unknown as Order;
      }
      return updated as unknown as Order;
    } catch (err: any) {
      this.log.error(
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
        status: { $ne: 'pendente' } as FilterOperators<string>,
      },
    });
  }

  async deletePending(): Promise<number> {
    const result = await this.repo.deleteMany({
      status: 'pendente',
    } as Filter<OrderTypeOrmEntity>);
    return result?.deletedCount ?? 0;
  }

  async *iterateByPriority(
    priority: Priority,
    batchSize = 10_000,
  ): AsyncGenerator<Order[], void> {
    const collection = (this.repo as any).mongodbCollection;
    if (!collection) {
      const all = await this.findByPriority(priority);
      for (let i = 0; i < all.length; i += batchSize) {
        yield all.slice(i, i + batchSize);
      }
      return;
    }

    const cursor = collection
      .find({ priority })
      .sort({ createdAt: 1 })
      .batchSize(batchSize);

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
    if (batch.length) yield batch;
  }
}
