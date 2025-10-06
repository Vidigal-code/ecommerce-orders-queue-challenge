'use client';
import useSWR from 'swr';
import { api } from '@/lib/api';
import { HealthResponse } from '@/lib/types';
import { PhaseBadge } from './PhaseBadge';

export function HealthPanel() {
    const { data, mutate } = useSWR<HealthResponse>('health', api.health, {
        refreshInterval: 7000
    });

    if (!data) {
        return (
            <div className="p-4 bg-neutral-900 border border-neutral-700 rounded">
                Loading health...
            </div>
        );
    }

    const processor = data.processor;

    return (
        <div className="p-4 rounded-lg bg-neutral-900 border border-neutral-700 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-3">
                <h3 className="font-semibold">Health / Queue</h3>
                {processor?.phase && <PhaseBadge phase={processor.phase} />}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 text-sm">
                <Stat label="Status" value={data.status} />
                <Stat label="Processing" value={processor?.isProcessing ? 'yes' : 'no'} />
                <Stat label="Aborting" value={processor?.aborting ? 'yes' : 'no'} />
                <Stat label="Has Failed Jobs" value={data.checks?.hasFailedJobs ? 'yes' : 'no'} />
                <Stat label="Is Stuck" value={data.checks?.isStuck ? 'yes' : 'no'} />
            </div>
            <div className="text-right">
                <button
                    className="text-xs bg-neutral-700 hover:bg-neutral-600 px-3 py-1 rounded"
                    onClick={() => mutate()}
                >
                    Refresh Health
                </button>
            </div>
        </div>
    );
}

function Stat({ label, value }: { label: string; value: string | number | boolean | null | undefined }) {
    return (
        <div className="p-2 bg-neutral-800 rounded flex flex-col">
            <span className="text-[10px] uppercase text-neutral-400">{label}</span>
            <span className="font-medium">{value ?? '-'}</span>
        </div>
    );
}