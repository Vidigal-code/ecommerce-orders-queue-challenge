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
}

export interface LogsResponse {
    processLog: any;
    queueStatus: any;
    logs: {
        logMessages: string[];
        warnMessages: string[];
        errorMessages: string[];
    };
    quickStats: {
        processedLines: number;
        vipProcessed: number;
        normalProcessed: number;
    };
}

export interface HealthResponse {
    status: string;
    timestamp: string;
    queue: {
        connected: boolean;
        paused?: boolean;
        waiting?: number;
        active?: number;
        completed?: number;
        failed?: number;
        delayed?: number;
    };
    processor?: {
        phase: Phase;
        isProcessing: boolean;
        enqueueVipTimeMs: number;
        enqueueNormalTimeMs: number;
        aborting: boolean;
    };
    checks?: {
        queueResponsive: boolean;
        hasFailedJobs: boolean;
        isStuck: boolean;
    };
}