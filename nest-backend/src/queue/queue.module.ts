import { Module } from '@nestjs/common';
import { QueueService } from './services/queue.service';
import { QueueManagerService } from './services/queue-manager.service';
import { GenerationProcessor } from './processors/generation.processor';
import { ProcessingProcessor } from './processors/processing.processor';

@Module({
  providers: [QueueService, QueueManagerService, GenerationProcessor, ProcessingProcessor],
  exports: [QueueService, QueueManagerService],
})
export class QueueModule {}