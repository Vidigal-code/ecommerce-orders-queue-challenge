import { Phase } from '../../infrastructure/queue/types/phase.types';

export interface OrdersStatusDto {
  generationTimeMs: number;
  enqueueVipTimeMs: number;
  enqueueNormalTimeMs: number;
  processing: {
    vip: {
      start: string | null;
      end: string | null;
      timeMs: number;
      count: number;
    };
    normal: {
      start: string | null;
      end: string | null;
      timeMs: number;
      count: number;
    };
  };
  totalTimeMs: number;
  counts: {
    vip: number;
    normal: number;
  };
  phase: Phase;
  lastRunId?: string;
  throughput: {
    vip: number;
    normal: number;
    overall: number;
  };
  eta: {
    estimatedMs: number | null;
    progressPercent: number;
  };
  progress: {
    target: number;
    generated: number;
    processedTotal: number;
  };
}
