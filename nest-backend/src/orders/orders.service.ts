import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Order } from '../database/schemas/order.schema';
import { Order as OrderInterface } from '../common/interfaces/order.interface';
import { Priority } from '../common/enums/priority.enum';

@Injectable()
export class OrdersService {
    constructor(@InjectModel(Order.name) private readonly orderModel: Model<OrderInterface>) {}

    async generateOrders(quantity: number): Promise<void> {
        const orders = [];
        for (let i = 0; i < quantity; i++) {
            const order = this.createRandomOrder(i);
            orders.push(order);
        }
        await this.orderModel.insertMany(orders);
    }

    private createRandomOrder(id: number): OrderInterface {
        const tiers = Object.values(Tier);
        const tier = tiers[Math.floor(Math.random() * tiers.length)];
        return {
            id,
            customer: `Customer ${id}`,
            amount: Math.floor(Math.random() * 1000) + 1,
            tier,
            observations: '',
            priority: tier === Tier.DIAMOND ? Priority.HIGH : Priority.NORMAL,
        };
    }

    async processOrders(): Promise<void> {
        const vipOrders = await this.orderModel.find({ tier: Tier.DIAMOND });
        await this.markOrdersAsProcessed(vipOrders, 'sent with priority');

        const normalOrders = await this.orderModel.find({ tier: { $ne: Tier.DIAMOND } });
        await this.markOrdersAsProcessed(normalOrders, 'processed without priority');
    }

    private async markOrdersAsProcessed(orders: OrderInterface[], observation: string): Promise<void> {
        for (const order of orders) {
            order.observations = observation;
            await this.orderModel.updateOne({ id: order.id }, order);
        }
    }
}