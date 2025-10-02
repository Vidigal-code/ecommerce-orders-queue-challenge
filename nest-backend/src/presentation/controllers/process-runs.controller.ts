import {
  Controller,
  Get,
  Query,
  DefaultValuePipe,
  ParseIntPipe,
  Inject,
} from '@nestjs/common';
import type { IProcessRunRepository } from '../../domain/repositories/process-run.repository';

@Controller('pedidos/runs')
export class ProcessRunsController {
  constructor(
    @Inject('IProcessRunRepository')
    private readonly runsRepo?: IProcessRunRepository,
  ) {}

  @Get()
  async list(
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    if (!this.runsRepo) return { runs: [], limit };
    const safeLimit = Math.min(200, Math.max(1, limit));
    const runs = await this.runsRepo.findRecent(safeLimit);
    return {
      limit: safeLimit,
      count: runs.length,
      runs: runs.map((r) => ({
        runId: r.runId,
        createdAt: r.createdAt,
        generationTimeMs: r.generationTimeMs,
        processingTimeVIPMs: r.processingTimeVIPMs,
        processingTimeNormalMs: r.processingTimeNormalMs,
        totalProcessedVIP: r.totalProcessedVIP,
        totalProcessedNormal: r.totalProcessedNormal,
        totalTimeMs: r.totalTimeMs,
        enqueueVipTimeMs: r.enqueueVipTimeMs,
        enqueueNormalTimeMs: r.enqueueNormalTimeMs,
      })),
    };
  }
}
