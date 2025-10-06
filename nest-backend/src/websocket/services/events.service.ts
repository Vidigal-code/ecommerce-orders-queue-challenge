import { Injectable } from '@nestjs/common';
import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';

@Injectable()
@WebSocketGateway()
export class EventsService {
  @WebSocketServer()
  server: Server;

  emitOrderUpdate(order: any) {
    this.server.emit('orderUpdate', order);
  }

  emitProcessingMetrics(metrics: any) {
    this.server.emit('processingMetrics', metrics);
  }

  emitLogMessage(message: string) {
    this.server.emit('logMessage', message);
  }
}