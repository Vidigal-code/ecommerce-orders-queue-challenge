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
import { performance } from 'node:perf_hooks';

export interface LogMessage {
  timestamp: number;
  level: 'log' | 'warn' | 'error';
  message: string;
  category?: string;
  data?: any;
}

export interface ProgressUpdate {
  phase: string;
  progress: number;
  total?: number;
  current?: number;
  message?: string;
  vipProcessed?: number;
  normalProcessed?: number;
  generationTime?: number;
  vipProcessingTime?: number;
  normalProcessingTime?: number;
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

  emitLog(logMessage: LogMessage) {
    if (this.server) {
      this.server.emit('log', logMessage);
    }
  }

  emitProgress(update: ProgressUpdate & { version?: number; monoMs?: number }) {
    if (this.server) {
      this.server.emit('progress', {
        version: update.version ?? 2,
        monoMs: update.monoMs ?? performance.now(),
        ...update,
        timestamp: Date.now(),
      });
    }
  }

  emitStatus(status: any & { version?: number; monoMs?: number }) {
    if (this.server) {
      this.server.emit('status', {
        version: status.version ?? 2,
        monoMs: status.monoMs ?? performance.now(),
        ...status,
        timestamp: Date.now(),
      });
    }
  }

  emitMetrics(metrics: any) {
    if (this.server) {
      this.server.emit('metrics', {
        ...metrics,
        timestamp: Date.now(),
      });
    }
  }

  @SubscribeMessage('get-status')
  handleGetStatus(@ConnectedSocket() client: Socket) {
    client.emit('status-request-acknowledged', {
      timestamp: Date.now(),
      message: 'Status request received',
    });
  }

  @SubscribeMessage('start-generation')
  handleStartGeneration(
    @MessageBody() data: { quantity: number },
    @ConnectedSocket() client: Socket,
  ) {
    this.logger.log(
      `Client ${client.id} requested order generation: ${data.quantity}`,
    );

    client.emit('generation-started', {
      quantity: data.quantity,
      timestamp: Date.now(),
      message: `Starting generation of ${data.quantity} orders`,
    });

    return { acknowledged: true, quantity: data.quantity };
  }

  @SubscribeMessage('cancel-operation')
  handleCancelOperation(@ConnectedSocket() client: Socket) {
    this.logger.log(`Client ${client.id} requested operation cancellation`);

    client.emit('operation-cancelled', {
      timestamp: Date.now(),
      message: 'Operation cancellation requested',
    });

    return { acknowledged: true };
  }

  @SubscribeMessage('reset-system')
  handleResetSystem(@ConnectedSocket() client: Socket) {
    this.logger.log(`Client ${client.id} requested system reset`);

    client.emit('system-reset', {
      timestamp: Date.now(),
      message: 'System reset initiated',
    });

    return { acknowledged: true };
  }

  getConnectedClientsCount(): number {
    return this.connectedClients.size;
  }
}
