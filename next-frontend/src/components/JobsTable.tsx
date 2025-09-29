'use client';
import useSWR from 'swr';
import { api } from '@/lib/api';

export function JobsTable() {
    const { data, mutate } = useSWR(
        'jobs',
        () => api.queueJobs('waiting,active,failed', 0, 100),
        { refreshInterval: 10000 }
    );

    return (
        <div className="p-4 rounded bg-neutral-900 border border-neutral-700 space-y-2">
            <div className="flex items-center justify-between">
                <h3 className="font-semibold">Jobs (waiting / active / failed)</h3>
                <button
                    onClick={() => mutate()}
                    className="text-xs px-3 py-1 bg-neutral-700 hover:bg-neutral-600 rounded"
                >
                    Refresh
                </button>
            </div>
            <div className="overflow-auto max-h-96">
                <table className="w-full text-sm">
                    <thead>
                    <tr className="text-left bg-neutral-800">
                        <th className="p-2">ID</th>
                        <th className="p-2">Name</th>
                        <th className="p-2">State</th>
                        <th className="p-2">Priority</th>
                        <th className="p-2">Type</th>
                    </tr>
                    </thead>
                    <tbody>
                    {(data || []).map(j => {
                        const prio = j.data?.priority;
                        return (
                            <tr
                                key={j.id}
                                className="border-b border-neutral-800 hover:bg-neutral-800/60"
                            >
                                <td className="p-2">{j.id}</td>
                                <td className="p-2">{j.name}</td>
                                <td className="p-2">{j.state}</td>
                                <td className="p-2">{prio || '-'}</td>
                                <td className="p-2">{prio === 'VIP' ? 'VIP' : 'NORMAL'}</td>
                            </tr>
                        );
                    })}
                    </tbody>
                </table>
                {!data?.length && (
                    <div className="text-xs text-neutral-500 py-4">
                        No jobs in selected states.
                    </div>
                )}
            </div>
        </div>
    );
}