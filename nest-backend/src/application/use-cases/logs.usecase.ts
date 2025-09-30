import { Injectable, Inject } from '@nestjs/common';
import { Priority } from '../../domain/entities/order.entity';
import * as orderRepository from '../../domain/repositories/order.repository';
import type { IProcessRunRepository } from '../../domain/repositories/process-run.repository';
import { v4 as uuidv4 } from 'uuid';
import { ProcessLog } from './interfaces/logs.interface.usecase';

@Injectable()
export class LogsUseCase {
  private generationTimeMs = 0;
  private processingTimeVIPMs = 0;
  private processingTimeNormalMs = 0;
  private startVIP?: Date;
  private endVIP?: Date;
  private startNormal?: Date;
  private endNormal?: Date;

  private enqueueVipTimeMs = 0;
  private enqueueNormalTimeMs = 0;
  private phase: string | undefined;

  private totalQuantityTarget = 0;
  private generatedCount = 0;
  private lastVipCount = 0;
  private lastNormalCount = 0;
  private processStartGlobal?: Date;
  private processEndGlobal?: Date;

  constructor(
    @Inject('IOrderRepository')
    private readonly orderRepo: orderRepository.IOrderRepository,
    @Inject('IProcessRunRepository')
    private readonly processRunRepo?: IProcessRunRepository,
  ) {}

  setTotalQuantityTarget(q: number) {
    this.totalQuantityTarget = q;
  }
  incrementGenerated(by: number) {
    this.generatedCount += by;
    if (!this.processStartGlobal) {
      this.processStartGlobal = new Date();
    }
  }

  setGenerationTime(ms: number) {
    this.generationTimeMs = ms;
  }
  setEnqueueVipTime(ms: number) {
    this.enqueueVipTimeMs = ms;
  }
  setEnqueueNormalTime(ms: number) {
    this.enqueueNormalTimeMs = ms;
  }
  setPhase(p: string) {
    if ((p === 'DONE' || p === 'ERROR') && !this.processEndGlobal) {
      this.processEndGlobal = new Date();
    }
    this.phase = p;
  }

  setVIPProcessing(start: Date, end: Date, ms: number) {
    this.startVIP = start;
    this.endVIP = end;
    this.processingTimeVIPMs = ms;
  }
  setNormalProcessing(start: Date, end: Date, ms: number) {
    this.startNormal = start;
    this.endNormal = end;
    this.processingTimeNormalMs = ms;
  }

  markStart(priority: Priority) {
    if (!this.processStartGlobal) {
      this.processStartGlobal = new Date();
    }
    if (priority === Priority.VIP) {
      if (!this.startVIP) this.startVIP = new Date();
    } else {
      if (!this.startNormal) this.startNormal = new Date();
    }
  }

  markEnd(priority: Priority) {
    const now = new Date();
    if (priority === Priority.VIP) {
      if (this.startVIP) {
        this.endVIP = now;
        this.processingTimeVIPMs =
          this.endVIP.getTime() - this.startVIP.getTime();
      } else {
        this.startVIP = now;
        this.endVIP = now;
        this.processingTimeVIPMs = 0;
      }
    } else {
      if (this.startNormal) {
        this.endNormal = now;
        this.processingTimeNormalMs =
          this.endNormal.getTime() - this.startNormal.getTime();
      } else {
        this.startNormal = now;
        this.endNormal = now;
        this.processingTimeNormalMs = 0;
      }
    }
  }

  private computeTotalTime(): number {
    return (
      this.generationTimeMs +
      this.enqueueVipTimeMs +
      this.enqueueNormalTimeMs +
      this.processingTimeVIPMs +
      this.processingTimeNormalMs
    );
  }

  private async getProcessedCounts(): Promise<{
    vip: number;
    normal: number;
  }> {
    const repoAny = this.orderRepo as any;
    const hasProcessedCounter =
      typeof repoAny.countProcessedByPriority === 'function';

    const vip = hasProcessedCounter
      ? await repoAny.countProcessedByPriority(Priority.VIP)
      : await this.orderRepo.countByPriority(Priority.VIP);

    const normal = hasProcessedCounter
      ? await repoAny.countProcessedByPriority(Priority.NORMAL)
      : await this.orderRepo.countByPriority(Priority.NORMAL);

    return { vip, normal };
  }

  private computeThroughput(
    vipCount: number,
    normalCount: number,
  ): {
    vip: number;
    normal: number;
    overall: number;
  } {
    const now = Date.now();
    let vipMsWindow = 0;
    if (this.startVIP) {
      vipMsWindow = (this.endVIP?.getTime() || now) - this.startVIP.getTime();
    }
    let normalMsWindow = 0;
    if (this.startNormal) {
      normalMsWindow =
        (this.endNormal?.getTime() || now) - this.startNormal.getTime();
    }
    let globalWindowMs = 0;
    if (this.processStartGlobal) {
      globalWindowMs =
        (this.processEndGlobal?.getTime() || now) -
        this.processStartGlobal.getTime();
    }

    const safe = (ms: number, count: number) =>
      ms > 0 ? count / (ms / 1000) : 0;

    return {
      vip: safe(vipMsWindow, vipCount),
      normal: safe(normalMsWindow, normalCount),
      overall: safe(globalWindowMs, vipCount + normalCount),
    };
  }

  private computeEta(
    phase: string | undefined,
    vipCount: number,
    normalCount: number,
  ): { estimatedMs: number | null; progressPercent: number } {
    if (!this.totalQuantityTarget || this.totalQuantityTarget <= 0) {
      return { estimatedMs: null, progressPercent: 0 };
    }

    const totalProcessed = vipCount + normalCount;
    const progressPercent = (totalProcessed / this.totalQuantityTarget) * 100;

    if (phase === 'DONE' || phase === 'ERROR') {
      return { estimatedMs: 0, progressPercent };
    }

    const remaining = this.totalQuantityTarget - totalProcessed;
    if (remaining <= 0) {
      return { estimatedMs: 0, progressPercent: 100 };
    }

    const now = Date.now();
    let elapsedMs = 0;
    if (this.processStartGlobal) {
      elapsedMs = now - this.processStartGlobal.getTime();
    }
    const throughputOverallSec =
      totalProcessed && elapsedMs > 0 ? totalProcessed / (elapsedMs / 1000) : 0;
    if (throughputOverallSec <= 0) {
      return { estimatedMs: null, progressPercent };
    }
    const etaSeconds = remaining / throughputOverallSec;
    return { estimatedMs: etaSeconds * 1000, progressPercent };
  }

  async getProcessLog(): Promise<
    ProcessLog & {
      throughput: { vip: number; normal: number; overall: number };
      eta: { estimatedMs: number | null; progressPercent: number };
      target: number;
      generated: number;
    }
  > {
    const { vip, normal } = await this.getProcessedCounts();
    const totalTimeMs = this.computeTotalTime();
    const throughput = this.computeThroughput(vip, normal);
    const eta = this.computeEta(this.phase, vip, normal);

    return {
      generationTimeMs: this.generationTimeMs,
      processingTimeVIPMs: this.processingTimeVIPMs,
      processingTimeNormalMs: this.processingTimeNormalMs,
      startVIP: this.startVIP ?? null,
      endVIP: this.endVIP ?? null,
      startNormal: this.startNormal ?? null,
      endNormal: this.endNormal ?? null,
      totalProcessedVIP: vip,
      totalProcessedNormal: normal,
      totalTimeMs,
      enqueueVipTimeMs: this.enqueueVipTimeMs,
      enqueueNormalTimeMs: this.enqueueNormalTimeMs,
      phase: this.phase,
      throughput,
      eta,
      target: this.totalQuantityTarget,
      generated: this.generatedCount,
    };
  }

  resetLogs() {
    this.generationTimeMs = 0;
    this.processingTimeVIPMs = 0;
    this.processingTimeNormalMs = 0;
    this.enqueueVipTimeMs = 0;
    this.enqueueNormalTimeMs = 0;
    this.phase = undefined;
    this.startVIP = undefined;
    this.endVIP = undefined;
    this.startNormal = undefined;
    this.endNormal = undefined;
    this.totalQuantityTarget = 0;
    this.generatedCount = 0;
    this.lastVipCount = 0;
    this.lastNormalCount = 0;
    this.processStartGlobal = undefined;
    this.processEndGlobal = undefined;
  }

  async persistRun(): Promise<void> {
    if (!this.processRunRepo) return;
    try {
      const log = await this.getProcessLog();
      await this.processRunRepo.save({
        runId: uuidv4(),
        generationTimeMs: log.generationTimeMs,
        processingTimeVIPMs: log.processingTimeVIPMs,
        processingTimeNormalMs: log.processingTimeNormalMs,
        startVIP: log.startVIP ?? null,
        endVIP: log.endVIP ?? null,
        startNormal: log.startNormal ?? null,
        endNormal: log.endNormal ?? null,
        totalProcessedVIP: log.totalProcessedVIP,
        totalProcessedNormal: log.totalProcessedNormal,
        totalTimeMs: log.totalTimeMs,
        enqueueVipTimeMs: log.enqueueVipTimeMs,
        enqueueNormalTimeMs: log.enqueueNormalTimeMs,
        createdAt: new Date(),
      });
    } catch (err) {
      console.warn('LogsUseCase.persistRun failed:', err);
    }
  }
}
