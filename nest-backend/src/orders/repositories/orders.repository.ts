import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Order } from '../database/schemas/order.schema';
import { CreateOrderDto } from '../dto/create-order.dto';

@Injectable()
export class OrdersRepository {
  constructor(@InjectModel(Order.name) private orderModel: Model<Order>) {}

  async createOrder(createOrderDto: CreateOrderDto): Promise<Order> {
    const newOrder = new this.orderModel(createOrderDto);
    return newOrder.save();
  }

  async findAll(): Promise<Order[]> {
    return this.orderModel.find().exec();
  }

  async findById(orderId: string): Promise<Order> {
    return this.orderModel.findById(orderId).exec();
  }

  async updateOrder(orderId: string, updateData: Partial<Order>): Promise<Order> {
    return this.orderModel.findByIdAndUpdate(orderId, updateData, { new: true }).exec();
  }

  async deleteOrder(orderId: string): Promise<Order> {
    return this.orderModel.findByIdAndDelete(orderId).exec();
  }
}