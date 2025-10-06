import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { Order } from '../../common/interfaces/order.interface';
import { ProcessingStatus } from '../../common/interfaces/processing-status.interface';
import { OrderRepository } from '../../orders/repositories/orders.repository';
import { EventsService } from '../../websocket/services/events.service';

@Injectable()
export class QueueService {
  private orderQueue: Queue<Order>;

  constructor(
    private readonly orderRepository: OrderRepository,
    private readonly eventsService: EventsService,
  ) {
    this.orderQueue = new Queue<Order>('order-queue');
  }

  async addOrderToQueue(order: Order): Promise<void> {
    await this.orderQueue.add('process-order', order);
    this.eventsService.broadcastOrderAdded(order);
  }

  async processOrders(): Promise<void> {
    this.orderQueue.process(async (job) => {
      const order: Order = job.data;
      const startTime = Date.now();
      const processingStatus: ProcessingStatus = {
        orderId: order.id,
        status: 'processing',
        startTime: new Date(startTime),
      };

      await this.orderRepository.updateOrderStatus(order.id, processingStatus);
      // Simulate order processing logic here
      await this.orderRepository.markOrderAsProcessed(order.id);

      const endTime = Date.now();
      processingStatus.status = 'completed';
      processingStatus.endTime = new Date(endTime);
      await this.orderRepository.updateOrderStatus(order.id, processingStatus);
      this.eventsService.broadcastOrderProcessed(order);
    });
  }
}