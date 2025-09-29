import { Injectable, Inject } from '@nestjs/common';
import { Priority } from '../../domain/entities/order.entity';
import * as orderRepository from "../../domain/repositories/order.repository";
import type { IProcessRunRepository } from '../../domain/repositories/process-run.repository';
import { v4 as uuidv4 } from 'uuid';

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

    constructor(
        @Inject('IOrderRepository')
        private readonly orderRepo:  orderRepository.IOrderRepository,
        @Inject('IProcessRunRepository')
        private readonly processRunRepo?: IProcessRunRepository,
    ) {}

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
        this.phase = p;
    }

    setVIPProcessing(start: Date, end: Date, ms: number) {
        this.startVIP = start;
        this.endVIP = end;
        this.processingTimeVIPMs = ms;
    }
    setNormalProcessing(start: Date, end: Date, ms: number) {
        this.startNormal = start;
        this.endNormal = end;
        this.processingTimeNormalMs = ms;
    }

    markStart(priority: Priority) {
        if (priority === Priority.VIP) {
            if (!this.startVIP) this.startVIP = new Date();
        } else {
            if (!this.startNormal) this.startNormal = new Date();
        }
    }

    markEnd(priority: Priority) {
        const now = new Date();
        if (priority === Priority.VIP) {
            if (this.startVIP) {
                this.endVIP = now;
                this.processingTimeVIPMs = this.endVIP.getTime() - this.startVIP.getTime();
            } else {
                this.startVIP = now;
                this.endVIP = now;
                this.processingTimeVIPMs = 0;
            }
        } else {
            if (this.startNormal) {
                this.endNormal = now;
                this.processingTimeNormalMs = this.endNormal.getTime() - this.startNormal.getTime();
            } else {
                this.startNormal = now;
                this.endNormal = now;
                this.processingTimeNormalMs = 0;
            }
        }
    }

    async getProcessLog(): Promise<ProcessLog> {
        const repoAny = this.orderRepo as any;
        const hasProcessedCounter = typeof repoAny.countProcessedByPriority === 'function';

        const totalProcessedVIP = hasProcessedCounter
            ? await repoAny.countProcessedByPriority(Priority.VIP)
            : await this.orderRepo.countByPriority(Priority.VIP);

        const totalProcessedNormal = hasProcessedCounter
            ? await repoAny.countProcessedByPriority(Priority.NORMAL)
            : await this.orderRepo.countByPriority(Priority.NORMAL);

        return {
            generationTimeMs: this.generationTimeMs,
            processingTimeVIPMs: this.processingTimeVIPMs,
            processingTimeNormalMs: this.processingTimeNormalMs,
            startVIP: this.startVIP ?? null,
            endVIP: this.endVIP ?? null,
            startNormal: this.startNormal ?? null,
            endNormal: this.endNormal ?? null,
            totalProcessedVIP,
            totalProcessedNormal,
            totalTimeMs: this.generationTimeMs + this.processingTimeVIPMs + this.processingTimeNormalMs,
            enqueueVipTimeMs: this.enqueueVipTimeMs,
            enqueueNormalTimeMs: this.enqueueNormalTimeMs,
            phase: this.phase,
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