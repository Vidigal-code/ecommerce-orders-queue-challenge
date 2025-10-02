import { Injectable } from '@nestjs/common';
import { Phase } from '../types/phase.types';

@Injectable()
export class OrdersProcessStateService {
  private phase: Phase = 'IDLE';
  private aborted = false;
  private enqueueVipTimeMs = 0;
  private enqueueNormalTimeMs = 0;
  private activeGenerateJobId: string | null = null;

  setPhase(phase: Phase) {
    this.phase = phase;
  }

  getPhase(): Phase {
    return this.phase;
  }

  setAborted(aborted: boolean) {
    this.aborted = aborted;
  }
  isAborting(): boolean {
    return this.aborted;
  }

  setActiveGenerateJobId(id: string | null) {
    this.activeGenerateJobId = id;
  }
  hasActiveGeneration(): boolean {
    return !!this.activeGenerateJobId;
  }

  getActiveGenerateJobId(): string | null {
    return this.activeGenerateJobId;
  }

  setEnqueueVipTime(ms: number) {
    this.enqueueVipTimeMs = ms;
  }
  getEnqueueVipTimeMs() {
    return this.enqueueVipTimeMs;
  }

  setEnqueueNormalTime(ms: number) {
    this.enqueueNormalTimeMs = ms;
  }
  getEnqueueNormalTimeMs() {
    return this.enqueueNormalTimeMs;
  }

  resetAll() {
    this.phase = 'IDLE';
    this.aborted = false;
    this.enqueueVipTimeMs = 0;
    this.enqueueNormalTimeMs = 0;
    this.activeGenerateJobId = null;
  }
}
