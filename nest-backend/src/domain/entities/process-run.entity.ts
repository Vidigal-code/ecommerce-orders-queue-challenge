export class ProcessRun {
    id?: string;
    runId?: string;
    generationTimeMs?: number;
    processingTimeVIPMs?: number;
    processingTimeNormalMs?: number;
    startVIP?: Date | null;
    endVIP?: Date | null;
    startNormal?: Date | null;
    endNormal?: Date | null;
    totalProcessedVIP?: number;
    totalProcessedNormal?: number;
    totalTimeMs?: number;
    enqueueVipTimeMs?: number;
    enqueueNormalTimeMs?: number;
    createdAt?: Date;
}

export interface IProcessRunRepository {
    save(run: ProcessRun): Promise<void>;
    findLatest(): Promise<ProcessRun | null>;
    resetAll(): Promise<void>;
}