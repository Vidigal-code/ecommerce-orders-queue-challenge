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
    phase: 'IDLE' | 'GENERATING' | 'ENQUEUE_VIP' | 'WAITING_VIP_DRAIN' | 'ENQUEUE_NORMAL' | 'WAITING_NORMAL_DRAIN' | 'DONE' | 'ERROR';
    lastRunId?: string;
}