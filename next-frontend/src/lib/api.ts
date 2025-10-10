import { BACKEND_BASE_URL } from './constants';
import {
    OrdersStatusDto,
    LogsResponse,
    HealthResponse,
    QueueJob,
    QueueJobsEnvelope,
} from './types';


async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
    const res = await fetch(`${BACKEND_BASE_URL}${path}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...(options?.headers || {}),
        },
        cache: 'no-store',
    });

    if (!res.ok) {
        let bodyText: string;
        try {
            bodyText = await res.text();
        } catch {
            bodyText = '<no body>';
        }
        throw new Error(`API ${path} failed: ${res.status} ${bodyText}`);
    }

    try {
        return (await res.json()) as T;
    } catch (e) {
        throw new Error(`API ${path} invalid JSON: ${(e as Error).message}`);
    }
}


function normalizeJobsPayload(
    payload: QueueJobsEnvelope | QueueJob[] | undefined | null,
): QueueJob[] {
    if (!payload) return [];
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload.jobs)) return payload.jobs;
    return [];
}

export interface CancelParams {
    purge?: boolean;
    removePending?: boolean;
    resetLogs?: boolean;
    waitTimeoutMs?: number;
    pollIntervalMs?: number;
}

export const api = {
    status: () => apiFetch<OrdersStatusDto>('/pedidos'),

    health: () => apiFetch<HealthResponse>('/pedidos/health/queue'),

    logs: (lines = 300) =>
        apiFetch<LogsResponse>(`/pedidos/logs?lines=${encodeURIComponent(String(lines))}`),

    generate: (quantity: number) =>
        apiFetch<{ message: string }>(
            `/pedidos/generate?quantity=${encodeURIComponent(String(quantity))}`,
            { method: 'POST' },
        ),

    cancel: (params: CancelParams = {}) => {
        const {
            purge = true,
            removePending = true,
            resetLogs = false,
            waitTimeoutMs,
            pollIntervalMs,
        } = params;

        const qs = new URLSearchParams({
            purge: String(!!purge),
            removePending: String(!!removePending),
            resetLogs: String(!!resetLogs),
        });

        if (waitTimeoutMs != null) qs.set('waitTimeoutMs', String(waitTimeoutMs));
        if (pollIntervalMs != null) qs.set('pollIntervalMs', String(pollIntervalMs));

        return apiFetch<
            {
                aborted: boolean;
                queuePaused: boolean;
                removedPending?: number;
                purged?: boolean;
                logsReset?: boolean;
                message: string;
                waitedForStopMs?: number;
                stillActive?: boolean;
            }
        >(`/pedidos/cancel?${qs.toString()}`, { method: 'POST' });
    },

    reset: () =>
        apiFetch<{ message: string }>('/pedidos/reset', { method: 'POST' }),

    pause: () => apiFetch<void>('/pedidos/queue/pause', { method: 'POST' }),

    resume: () => apiFetch<void>('/pedidos/queue/resume', { method: 'POST' }),

    clean: (state: string) =>
        apiFetch<{ message: string }>(`/pedidos/queue/clean?state=${encodeURIComponent(state)}`, {
            method: 'POST',
        }),

    queueStatus: () => apiFetch('/pedidos/queue/status'),
    queueJobsRaw: (
        types = 'waiting,active,failed',
        start = 0,
        end = 100,
        includeData = true,
    ) =>
        apiFetch<QueueJobsEnvelope | QueueJob[]>(
            `/pedidos/queue/jobs?types=${encodeURIComponent(
                types,
            )}&start=${encodeURIComponent(String(start))}&end=${encodeURIComponent(
                String(end),
            )}&includeData=${includeURIComponentBool(includeData)}`,
        ),
    queueJobs: async (
        types = 'waiting,active,failed',
        start = 0,
        end = 100,
        includeData = true,
    ): Promise<QueueJob[]> => {
        const raw = await api.queueJobsRaw(types, start, end, includeData);
        return normalizeJobsPayload(raw);
    },
};

function includeURIComponentBool(v: boolean): string {
    return v ? 'true' : 'false';
}

