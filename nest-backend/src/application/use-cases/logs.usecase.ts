import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { Priority } from '../../domain/entities/order.entity';
import * as orderRepository from '../../domain/repositories/order.repository';
import type { IProcessRunRepository } from '../../domain/repositories/process-run.repository';
import { v4 as uuidv4 } from 'uuid';
import { ProcessLog } from './interfaces/logs-interface.usecase';
import { EventsGateway } from '../../infrastructure/websocket/events.gateway';

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
  private processStartGlobal?: Date;
  private processEndGlobal?: Date;

  constructor(
    @Inject('IOrderRepository')
    private readonly orderRepo: orderRepository.IOrderRepository,
    @Inject(forwardRef(() => EventsGateway))
    private readonly eventsGateway: EventsGateway,
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

    if (this.totalQuantityTarget > 0) {
      const progress = Math.min(
        (this.generatedCount / this.totalQuantityTarget) * 100,
        100,
      );
      this.eventsGateway.emitProgress({
        phase: 'GENERATING',
        progress,
        total: this.totalQuantityTarget,
        current: this.generatedCount,
        message: `Generated ${this.generatedCount}/${this.totalQuantityTarget} orders`,
      });
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
    if (
      (p === 'DONE' || p === 'ERROR' || p === 'ABORTED') &&
      !this.processEndGlobal
    ) {
      this.processEndGlobal = new Date();
    }
    this.phase = p;
    this.eventsGateway.emitStatus({
      phase: p,
      timestamp: Date.now(),
      message: `Phase changed to: ${p}`,
    });
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

  async markEnd(priority: Priority) {
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
    try {
      const counts = await this.getProcessedCounts();
      this.eventsGateway.emitProgress({
        phase:
          priority === Priority.VIP
            ? 'WAITING_VIP_DRAIN'
            : 'WAITING_NORMAL_DRAIN',
        progress: 100,
        vipProcessed: counts.vip,
        normalProcessed: counts.normal,
        vipProcessingTime: this.processingTimeVIPMs,
        normalProcessingTime: this.processingTimeNormalMs,
        message: `Processed ${priority} order (${counts.vip + counts.normal} total)`,
      });
    } catch (error) {}
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

  private async getProcessedCounts(): Promise<{ vip: number; normal: number }> {
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

  private computeThroughput(vipCount: number, normalCount: number) {
    const now = Date.now();
    const windowVip = this.startVIP
      ? (this.endVIP?.getTime() || now) - this.startVIP.getTime()
      : 0;
    const windowNormal = this.startNormal
      ? (this.endNormal?.getTime() || now) - this.startNormal.getTime()
      : 0;
    const globalWindow = this.processStartGlobal
      ? (this.processEndGlobal?.getTime() || now) -
        this.processStartGlobal.getTime()
      : 0;

    const rate = (ms: number, c: number) => (ms > 0 ? c / (ms / 1000) : 0);

    return {
      vip: rate(windowVip, vipCount),
      normal: rate(windowNormal, normalCount),
      overall: rate(globalWindow, vipCount + normalCount),
    };
  }

  private computeEta(
    phase: string | undefined,
    vipCount: number,
    normalCount: number,
  ) {
    if (!this.totalQuantityTarget || this.totalQuantityTarget <= 0) {
      return { estimatedMs: null, progressPercent: 0 };
    }
    const totalProcessed = vipCount + normalCount;
    const progressPercent = (totalProcessed / this.totalQuantityTarget) * 100;
    if (['DONE', 'ERROR', 'ABORTED'].includes(phase || '')) {
      return { estimatedMs: 0, progressPercent };
    }
    const remaining = this.totalQuantityTarget - totalProcessed;
    if (remaining <= 0) {
      return { estimatedMs: 0, progressPercent: 100 };
    }

    let elapsedMs = 0;
    if (this.processStartGlobal) {
      elapsedMs = Date.now() - this.processStartGlobal.getTime();
    }
    const throughput =
      totalProcessed && elapsedMs > 0 ? totalProcessed / (elapsedMs / 1000) : 0;
    if (throughput <= 0) return { estimatedMs: null, progressPercent };
    const etaSeconds = remaining / throughput;
    return { estimatedMs: etaSeconds * 1000, progressPercent };
  }

  async getProcessLog(): Promise<
    ProcessLog & {
      throughput: { vip: number; normal: number; overall: number };
      eta: { estimatedMs: number | null; progressPercent: number };
      target: number;
      generated: number;
      wallClockMs: number;
    }
  > {
    const { vip, normal } = await this.getProcessedCounts();
    const throughput = this.computeThroughput(vip, normal);
    const eta = this.computeEta(this.phase, vip, normal);
    const totalTimeMs = this.computeTotalTime();
    const wallClockMs = this.processStartGlobal
      ? (this.processEndGlobal?.getTime() || Date.now()) -
        this.processStartGlobal.getTime()
      : 0;

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
      wallClockMs,
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
