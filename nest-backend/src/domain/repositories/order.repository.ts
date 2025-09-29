import { Order, Priority } from '../entities/order.entity';

export interface IOrderRepository {
    save(order: Order): Promise<Order>;
    bulkSave(orders: Order[]): Promise<void>;
    findByPriority(priority: Priority): Promise<Order[]>;
    findAll(): Promise<Order[]>;
    update(order: Order): Promise<Order>;
    reset(): Promise<void>;
    countByPriority(priority: Priority): Promise<number>;
    countProcessedByPriority(priority: Priority): Promise<number>;
    deletePending(): Promise<number>;
}