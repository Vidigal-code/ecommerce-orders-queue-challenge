'use client';
import useSWR from 'swr';
import { api } from '@/lib/api';

export function QueueStatsCard() {
    const { data, mutate } = useSWR('queueStatus', api.queueStatus, {
        refreshInterval: 8000
    });
    if (!data) {
        return (
            <div className="p-4 bg-neutral-900 border border-neutral-700 rounded">
                Loading queue stats...
            </div>
        );
    }

    return (
        <div className="p-4 bg-neutral-900 border border-neutral-700 rounded space-y-2">
            <h3 className="font-semibold">Queue Counts</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {Object.entries(data).map(([k, v]) => (
                    <div
                        key={k}
                        className="bg-neutral-800 rounded p-2 flex flex-col"
                    >
            <span className="text-[10px] uppercase text-neutral-400">
              {k}
            </span>
                        <span className="font-medium">{v as any}</span>
                    </div>
                ))}
            </div>
            <div className="text-right">
                <button
                    onClick={() => mutate()}
                    className="text-xs px-3 py-1 bg-neutral-700 hover:bg-neutral-600 rounded"
                >
                    Refresh
                </button>
            </div>
        </div>
    );
}