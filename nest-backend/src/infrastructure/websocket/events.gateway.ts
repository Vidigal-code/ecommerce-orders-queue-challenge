import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, Logger } from '@nestjs/common';
import { LogsUseCase } from '../../application/use-cases/logs.usecase';
import { OrdersStatusDto } from '../../presentation/dtos/orders-status.dto';
import { Phase } from '../queue/types/phase.types';

export interface StatusUpdate {
  phase: string;
  target?: number;
  generated?: number;
  vipProcessed?: number;
  normalProcessed?: number;
  generationTime?: number;
  vipProcessingTime?: number;
  normalProcessingTime?: number;
  totalTime?: number;
  throughput?: {
    vip: number;
    normal: number;
    overall: number;
  };
  eta?: {
    estimatedMs: number;
    progressPercent: number;
  };
  timestamp: number;
}

@Injectable()
@WebSocketGateway({
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private logger = new Logger('EventsGateway');
  private connectedClients = new Set<string>();

  constructor() {}

  handleConnection(client: Socket) {
    this.connectedClients.add(client.id);
    this.logger.log(
      `Client connected: ${client.id} (Total: ${this.connectedClients.size})`,
    );

    client.emit('connected', {
      message: 'Connected to order processing server',
      timestamp: Date.now(),
      clientId: client.id,
    });
  }

  handleDisconnect(client: Socket) {
    this.connectedClients.delete(client.id);
    this.logger.log(
      `Client disconnected: ${client.id} (Total: ${this.connectedClients.size})`,
    );
  }

  async emitStatus(update?: Partial<StatusUpdate> | OrdersStatusDto | any) {
    if (this.server) {
      // For now, emit the update - frontend will handle it
      this.server.emit('status', update || {});
    }
  }

  emitProgress(update: {
    phase: string;
    progress: number;
    current?: number;
    total?: number;
    message?: string;
  }) {
    if (this.server) {
      this.server.emit('progress', {
        ...update,
        timestamp: Date.now(),
      });
    }
  }

  emitLog(update: {
    timestamp: number;
    level: 'log' | 'warn' | 'error';
    message: string;
    category?: string;
    data?: unknown;
  }) {
    if (this.server) {
      this.server.emit('log', update);
    }
  }

  @SubscribeMessage('get-status')
  async handleGetStatus(@ConnectedSocket() client: Socket) {
    try {
      // Get the current status from OrdersProcessStateService or similar
      const currentStatus = {}; // Should be replaced with actual status from a service

      // If we have a status, send it
      if (currentStatus && Object.keys(currentStatus).length > 0) {
        client.emit('status', currentStatus);
      } else {
        // Otherwise, send a default status to avoid crashes
        client.emit('status', {
          phase: 'IDLE',
          counts: { vip: 0, normal: 0 },
          processing: {
            vip: { start: null, end: null, timeMs: 0, count: 0 },
            normal: { start: null, end: null, timeMs: 0, count: 0 }
          },
          generationTimeMs: 0,
          enqueueVipTimeMs: 0,
          enqueueNormalTimeMs: 0,
          totalTimeMs: 0,
          throughput: { vip: 0, normal: 0, overall: 0 },
          eta: { estimatedMs: null, progressPercent: 0 },
          progress: { target: 0, generated: 0, processedTotal: 0 }
        });
      }
    } catch (error) {
      console.error('Error sending status to client:', error);
      // Send minimal status object to avoid client errors
      client.emit('status', { phase: 'IDLE', error: 'Error retrieving status' });
    }
  }
}