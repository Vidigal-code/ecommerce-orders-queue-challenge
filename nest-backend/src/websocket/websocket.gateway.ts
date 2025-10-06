import { WebSocketGateway, WebSocketServer, SubscribeMessage, WebSocketIcon, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server } from 'socket.io';
import { EventsService } from './services/events.service';

@WebSocketGateway({ cors: true })
export class WebSocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  constructor(private readonly eventsService: EventsService) {}

  handleConnection(client: any) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: any) {
    console.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('orderUpdate')
  handleOrderUpdate(client: any, payload: any) {
    this.eventsService.broadcastOrderUpdate(payload);
  }
}