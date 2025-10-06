import { Module } from '@nestjs/common';
import { WebsocketGateway } from './websocket.gateway';
import { EventsService } from './services/events.service';

@Module({
  providers: [WebsocketGateway, EventsService],
  exports: [WebsocketGateway],
})
export class WebsocketModule {}