import { BACKEND_BASE_URL } from './constants';
import {
    OrdersStatusDto,
    LogsResponse,
    HealthResponse,
    QueueJob,
    QueueJobsEnvelope,
    RunsResponse,
    CancelResult,
} from './types';

interface ApiFetchOptions extends RequestInit {
    signal?: AbortSignal;
    expectJson?: boolean;
}

async function apiFetch<T = unknown>(
    path: string,
    options: ApiFetchOptions = {},
): Promise<T> {
    const url = `${BACKEND_BASE_URL}${path}`;
    const { expectJson = true, ...rest } = options;

    let res: Response;
    try {
        res = await fetch(url, {
            cache: 'no-store',
            headers: {
                'Content-Type': 'application/json',
                ...(options.headers || {}),
            },
            ...rest,
        });
    } catch (networkErr) {
        throw new Error(`Network error calling ${path}: ${(networkErr as Error)?.message || String(networkErr)}`);
    }

    if (!res.ok) {
        let bodyText: string | undefined;
        try {
            const ct = res.headers.get('content-type') || '';
            if (ct.includes('application/json')) {
                const j = await res.json();
                bodyText = JSON.stringify(j);
            } else {
                bodyText = await res.text();
            }
        } catch {
            bodyText = '<unreadable body>';
        }
        throw new Error(`API ${path} failed: ${res.status} ${bodyText}`);
    }

    if (!expectJson) {
        const text = await res.text();
        return text as unknown as T;
    }

    if (res.status === 204) {
        return undefined as T;
    }

    try {
        return (await res.json()) as T;
    } catch (e) {
        throw new Error(
            `API ${path} invalid JSON: ${(e as Error).message}`,
        );
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

export interface GenerateOptions {
    force?: boolean;
    signal?: AbortSignal;
}

function boolToString(v: boolean): string {
    return v ? 'true' : 'false';
}

export const api = {
    ordersV2: (signal?: AbortSignal) =>
        apiFetch<unknown>('/orders', { signal }),
    status: (signal?: AbortSignal) =>
        apiFetch<OrdersStatusDto>('/pedidos', { signal }),

    health: (signal?: AbortSignal) =>
        apiFetch<HealthResponse>('/pedidos/health/queue', { signal }),

    logs: (lines = 300, signal?: AbortSignal) =>
        apiFetch<LogsResponse>(
            `/pedidos/logs?lines=${encodeURIComponent(String(lines))}`,
            { signal },
        ),

    runs: (limit = 25, signal?: AbortSignal) =>
        apiFetch<RunsResponse>(
            `/pedidos/runs?limit=${encodeURIComponent(String(limit))}`,
            { signal },
        ),

    generate: (quantity: number, options?: GenerateOptions) => {
        const { force = false, signal } = options || {};
        const qs = new URLSearchParams({
            quantity: String(quantity),
        });
        if (force) qs.set('force', 'true');
        return apiFetch<{ message: string }>(
            `/pedidos/generate?${qs.toString()}`,
            { method: 'POST', signal },
        );
    },

    cancel: (params: CancelParams = {}, signal?: AbortSignal) => {
        const {
            purge = true,
            removePending = true,
            resetLogs = false,
            waitTimeoutMs,
            pollIntervalMs,
        } = params;

        const qs = new URLSearchParams({
            purge: boolToString(purge),
            removePending: boolToString(removePending),
            resetLogs: boolToString(resetLogs),
        });

        if (waitTimeoutMs != null)
            qs.set('waitTimeoutMs', String(waitTimeoutMs));
        if (pollIntervalMs != null)
            qs.set('pollIntervalMs', String(pollIntervalMs));

        return apiFetch<CancelResult>(`/pedidos/cancel?${qs.toString()}`, {
            method: 'POST',
            signal,
        });
    },

    reset: (signal?: AbortSignal) =>
        apiFetch<{ message: string }>('/pedidos/reset', {
            method: 'POST',
            signal,
        }),

    pause: (signal?: AbortSignal) =>
        apiFetch<{ paused: boolean }>('/pedidos/queue/pause', {
            method: 'POST',
            signal,
        }),

    resume: (signal?: AbortSignal) =>
        apiFetch<{ resumed: boolean }>('/pedidos/queue/resume', {
            method: 'POST',
            signal,
        }),

    clean: (state: string, signal?: AbortSignal) =>
        apiFetch<{ removed: number; state: string }>(
            `/pedidos/queue/clean?state=${encodeURIComponent(state)}`,
            { method: 'POST', signal },
        ),
        
    retryFailed: (signal?: AbortSignal) =>
        apiFetch<{ retried: number }>(
            '/pedidos/queue/retry-failed',
            { method: 'POST', signal },
        ),

    queueStatus: (signal?: AbortSignal) =>
        apiFetch<{
            waiting: number;
            active: number;
            completed: number;
            failed: number;
            delayed: number;
            paused: boolean;
        }>('/pedidos/queue/status', { signal }),

    queueJobsRaw: (
        types = 'waiting,active,failed',
        start = 0,
        end = 100,
        includeData = true,
        signal?: AbortSignal,
    ) =>
        apiFetch<QueueJobsEnvelope | QueueJob[]>(
            `/pedidos/queue/jobs?types=${encodeURIComponent(
                types,
            )}&start=${encodeURIComponent(String(start))}&end=${encodeURIComponent(
                String(end),
            )}&includeData=${boolToString(includeData)}`,
            { signal },
        ),

    queueJobs: async (
        types = 'waiting,active,failed',
        start = 0,
        end = 100,
        includeData = true,
        signal?: AbortSignal,
    ): Promise<QueueJob[]> => {
        const raw = await api.queueJobsRaw(
            types,
            start,
            end,
            includeData,
            signal,
        );
        return normalizeJobsPayload(raw);
    },
};