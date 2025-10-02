export interface ExecuteOptions {
  force?: boolean;
  autoForceIfStale?: boolean;
  returnOnActive?: boolean;
  staleThresholdMs?: number;
}
