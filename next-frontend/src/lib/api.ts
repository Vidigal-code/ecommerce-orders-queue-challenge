import { BACKEND_BASE_URL } from './constants';
import { OrdersStatusDto, LogsResponse, HealthResponse } from './types';

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
    const res = await fetch(`${BACKEND_BASE_URL}${path}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...(options?.headers || {})
        },
        cache: 'no-store'
    });
    if (!res.ok) {
        throw new Error(`API ${path} failed: ${res.status} ${await res.text()}`);
    }
    return res.json();
}

export const api = {
    status: () => apiFetch<OrdersStatusDto>('/pedidos'),
    health: () => apiFetch<HealthResponse>('/pedidos/health/queue'),
    logs: (lines = 300) => apiFetch<LogsResponse>(`/pedidos/logs?lines=${lines}`),

    generate: (quantity: number) =>
        apiFetch<{ message: string }>(
            `/pedidos/generate?quantity=${quantity}`,
            { method: 'POST' }
        ),

    cancel: (params: {
        purge?: boolean;
        removePending?: boolean;
        resetLogs?: boolean;
    }) =>
        apiFetch(
            `/pedidos/cancel?purge=${params.purge !== false}&removePending=${
                params.removePending !== false
            }&resetLogs=${!!params.resetLogs}`,
            { method: 'POST' }
        ),

    reset: () =>
        apiFetch<{ message: string }>('/pedidos/reset', { method: 'POST' }),

    pause: () => apiFetch('/pedidos/queue/pause', { method: 'POST' }),
    resume: () => apiFetch('/pedidos/queue/resume', { method: 'POST' }),
    clean: (state: string) =>
        apiFetch(`/pedidos/queue/clean?state=${state}`, { method: 'POST' }),
    queueStatus: () => apiFetch('/pedidos/queue/status'),
    queueJobs: (types = 'waiting,active,failed', start = 0, end = 100) =>
        apiFetch<any[]>(
            `/pedidos/queue/jobs?types=${types}&start=${start}&end=${end}`
        ),
};