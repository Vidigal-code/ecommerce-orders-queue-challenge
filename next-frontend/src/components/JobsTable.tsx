'use client';

import useSWR from 'swr';
import { api } from '@/lib/api';
import type { QueueJob, QueueJobsEnvelope } from '@/lib/types';


function normalizeJobs(payload: QueueJobsEnvelope | QueueJob[] | undefined | null): QueueJob[] {
    if (!payload) return [];
    if (Array.isArray(payload)) return payload;
    if (Array.isArray((payload as QueueJobsEnvelope).jobs)) {
        return (payload as QueueJobsEnvelope).jobs;
    }
    return [];
}

export function JobsTable() {
    const {
        data: raw,
        error,
        isLoading,
        mutate,
    } = useSWR(
        ['queue-jobs', 'waiting,active,failed', 0, 100],
        () => api.queueJobsRaw?.('waiting,active,failed', 0, 100, true) ?? api.queueJobs('waiting,active,failed', 0, 100),
        { refreshInterval: 10000 },
    );

    const jobs = normalizeJobs(raw);

    return (
        <div className="p-4 rounded bg-neutral-900 border border-neutral-700 space-y-2">
            <div className="flex items-center justify-between">
                <h3 className="font-semibold">
                    Jobs (waiting / active / failed)
                    <span className="ml-2 text-xs text-neutral-400">
            {jobs.length ? `(${jobs.length})` : ''}
          </span>
                </h3>
                <div className="flex items-center gap-2">
                    {isLoading && (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-neutral-800 text-neutral-400">
              loading…
            </span>
                    )}
                    <button
                        onClick={() => mutate()}
                        className="text-xs px-3 py-1 bg-neutral-700 hover:bg-neutral-600 rounded"
                    >
                        Refresh
                    </button>
                </div>
            </div>

            {error && (
                <div className="text-xs text-red-400 bg-red-950/30 border border-red-800 rounded p-2">
                    Failed to load jobs: {error.message || String(error)}
                </div>
            )}

            <div className="overflow-auto max-h-96 rounded border border-neutral-800">
                <table className="w-full text-sm">
                    <thead>
                    <tr className="text-left bg-neutral-800/70">
                        <th className="p-2 w-[90px]">ID</th>
                        <th className="p-2">Name</th>
                        <th className="p-2 w-[110px]">State</th>
                        <th className="p-2 w-[80px]">Priority</th>
                        <th className="p-2 w-[90px]">Type</th>
                        <th className="p-2 w-[120px]">Attempts</th>
                        <th className="p-2 w-[130px]">Started</th>
                        <th className="p-2 w-[130px]">Finished</th>
                    </tr>
                    </thead>
                    <tbody>
                    {jobs.map((j) => {
                        const prio = (j.data as any)?.priority;
                        const isVip = prio === 'VIP';
                        const started = j.processedOn
                            ? new Date(j.processedOn).toLocaleTimeString()
                            : '';
                        const finished = j.finishedOn
                            ? new Date(j.finishedOn).toLocaleTimeString()
                            : '';

                        return (
                            <tr
                                key={j.id}
                                className="border-b border-neutral-800 hover:bg-neutral-800/50"
                            >
                                <td className="p-2 font-mono text-xs">{j.id}</td>
                                <td className="p-2">{j.name}</td>
                                <td className="p-2">
                    <span
                        className={`px-2 py-0.5 rounded text-xs ${
                            j.state === 'failed'
                                ? 'bg-red-900/40 text-red-300'
                                : j.state === 'active'
                                    ? 'bg-blue-900/40 text-blue-300'
                                    : j.state === 'waiting'
                                        ? 'bg-yellow-900/40 text-yellow-300'
                                        : 'bg-neutral-700 text-neutral-200'
                        }`}
                    >
                      {j.state}
                    </span>
                                </td>
                                <td className="p-2">
                                    {prio ? (
                                        <span
                                            className={`text-xs px-2 py-0.5 rounded ${
                                                isVip
                                                    ? 'bg-fuchsia-900/40 text-fuchsia-300'
                                                    : 'bg-neutral-700 text-neutral-200'
                                            }`}
                                        >
                        {prio}
                      </span>
                                    ) : (
                                        '-'
                                    )}
                                </td>
                                <td className="p-2">{isVip ? 'VIP' : 'NORMAL'}</td>
                                <td className="p-2 text-center">
                                    {j.attemptsMade != null ? j.attemptsMade : '-'}
                                </td>
                                <td className="p-2 text-xs">{started}</td>
                                <td className="p-2 text-xs">{finished}</td>
                            </tr>
                        );
                    })}

                    {!jobs.length && !isLoading && (
                        <tr>
                            <td
                                colSpan={8}
                                className="p-6 text-center text-xs text-neutral-500"
                            >
                                No jobs in selected states.
                            </td>
                        </tr>
                    )}

                    {isLoading && !jobs.length && (
                        <tr>
                            <td
                                colSpan={8}
                                className="p-6 text-center text-xs text-neutral-500 animate-pulse"
                            >
                                Loading…
                            </td>
                        </tr>
                    )}
                    </tbody>
                </table>
            </div>

            <div className="flex justify-end">
                <button
                    onClick={() => mutate()}
                    className="text-[10px] px-2 py-1 bg-neutral-800 rounded hover:bg-neutral-700"
                >
                    Reload now
                </button>
            </div>
        </div>
    );
}