export interface ProcessLog {
  generationTimeMs: number;
  processingTimeVIPMs: number;
  processingTimeNormalMs: number;
  startVIP: Date | null;
  endVIP: Date | null;
  startNormal: Date | null;
  endNormal: Date | null;
  totalProcessedVIP: number;
  totalProcessedNormal: number;
  totalTimeMs: number;
  enqueueVipTimeMs?: number;
  enqueueNormalTimeMs?: number;
  phase?: string;
}
