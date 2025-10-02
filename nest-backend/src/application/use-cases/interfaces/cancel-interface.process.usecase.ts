export interface CancelOptions {
  purge?: boolean;
  resetLogs?: boolean;
  removePending?: boolean;
  waitTimeoutMs?: number;
  pollIntervalMs?: number;
  resetPhaseToIdle?: boolean;
}

export interface CancelResult {
  aborted: boolean;
  queuePaused: boolean;
  removedPending?: number;
  purged?: boolean;
  logsReset?: boolean;
  message: string;
  waitedForStopMs?: number;
  stillActive?: boolean;
}
