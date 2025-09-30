export type Phase =
    | 'IDLE'
    | 'GENERATING'
    | 'ENQUEUE_VIP'
    | 'WAITING_VIP_DRAIN'
    | 'ENQUEUE_NORMAL'
    | 'WAITING_NORMAL_DRAIN'
    | 'DONE'
    | 'ERROR';

export interface OrdersStatusDto {
    generationTimeMs: number;
    enqueueVipTimeMs: number;
    enqueueNormalTimeMs: number;
    processing: {
        vip: { start: string | null; end: string | null; timeMs: number; count: number };
        normal: { start: string | null; end: string | null; timeMs: number; count: number };
    };
    totalTimeMs: number;
    counts: { vip: number; normal: number };
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

export interface ProcessLog {
    generationTimeMs: number;
    processingTimeVIPMs: number;
    processingTimeNormalMs: number;
    startVIP: string | null;
    endVIP: string | null;
    startNormal: string | null;
    endNormal: string | null;
    totalProcessedVIP: number;
    totalProcessedNormal: number;
    totalTimeMs: number;
    enqueueVipTimeMs?: number;
    enqueueNormalTimeMs?: number;
    phase?: Phase | string;
}

export interface LogFileMessages {
    logMessages: string[];
    warnMessages: string[];
    errorMessages: string[];
}

export interface QueueStatus {
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
    paused: boolean;
}

export interface LogsResponse {
    processLog: ProcessLog;
    queueStatus: QueueStatus;
    logs: LogFileMessages;
    quickStats: {
        processedLines: number;
        vipProcessed: number;
        normalProcessed: number;
    };
}

export interface ProcessorStatus {
    phase: Phase;
    isProcessing: boolean;
    enqueueVipTimeMs: number;
    enqueueNormalTimeMs: number;
    aborting: boolean;
}

export interface HealthChecks {
    queueResponsive: boolean;
    hasFailedJobs: boolean;
    isStuck: boolean;
}

export interface HealthResponseOk {
    status: 'healthy' | 'degraded' | 'paused';
    timestamp: string;
    queue: {
        connected: true;
        paused: boolean;
        waiting: number;
        active: number;
        completed: number;
        failed: number;
        delayed: number;
    };
    processor: ProcessorStatus;
    checks: HealthChecks;
    error?: never;
}

export interface HealthResponseError {
    status: 'unhealthy';
    timestamp: string;
    queue: {
        connected: false;
    };
    error: string;
    processor?: never;
    checks?: never;
}

export type HealthResponse = HealthResponseOk | HealthResponseError;

export interface QueueJob {
    id: string | number;
    name: string;
    state: string;
    attemptsMade?: number;
    timestamp?: number;
    processedOn?: number | null;
    finishedOn?: number | null;
    data?: unknown;
}

export interface QueueJobsEnvelope {
    total: number;
    types: string[];
    range: { start: number; end: number };
    jobs: QueueJob[];
}

export function normalizeJobsPayload(
    payload: QueueJobsEnvelope | QueueJob[] | undefined | null,
): QueueJob[] {
    if (!payload) return [];
    if (Array.isArray(payload)) return payload;
    if (Array.isArray((payload as QueueJobsEnvelope).jobs)) {
        return (payload as QueueJobsEnvelope).jobs;
    }
    return [];
}