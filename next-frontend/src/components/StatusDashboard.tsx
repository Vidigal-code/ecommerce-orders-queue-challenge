'use client';
import useSWR from 'swr';
import { api } from '@/lib/api';
import { OrdersStatusDto } from '@/lib/types';
import { numberFmt, ms } from '@/lib/format';
import { PhaseBadge } from './PhaseBadge';
import { TimelineBar } from './TimelineBar';

export function StatusDashboard({ initial }: { initial: OrdersStatusDto | null }) {
    const { data, mutate } = useSWR('status', api.status, {
        fallbackData: initial || undefined,
        refreshInterval: 6000,
    });

    if (!data) {
        return (
            <div className="p-4 bg-neutral-900 border border-neutral-700 rounded">
                Status not available.
            </div>
        );
    }

    const generation = data.generationTimeMs;
    const vip = data.processing.vip.timeMs;
    const normal = data.processing.normal.timeMs;
    const total = generation + vip + normal;

    return (
        <div className="p-4 rounded-lg bg-neutral-900 border border-neutral-700 space-y-4">
            <div className="flex flex-wrap gap-4 items-center justify-between">
                <h2 className="text-lg font-semibold">Execution Status</h2>
                <PhaseBadge phase={data.phase} />
            </div>

            <div className="grid gap-4 grid-cols-2 md:grid-cols-4 xl:grid-cols-6">
                <InfoCard label="VIP Processed" value={numberFmt(data.counts.vip)} />
                <InfoCard label="NORMAL Processed" value={numberFmt(data.counts.normal)} />
                <InfoCard label="Generation" value={ms(generation)} />
                <InfoCard label="VIP Window" value={ms(vip)} />
                <InfoCard label="NORMAL Window" value={ms(normal)} />
                <InfoCard label="Total Time" value={ms(total)} />
                <InfoCard label="VIP Enqueue" value={ms(data.enqueueVipTimeMs)} />
                <InfoCard label="NORMAL Enqueue" value={ms(data.enqueueNormalTimeMs)} />
                <InfoCard label="Last Run ID" value={data.lastRunId || '-'} />
            </div>

            <TimelineBar
                segments={[
                    { label: 'Generation', ms: generation, color: '#6366f1' },
                    { label: 'VIP Proc', ms: vip, color: '#d97706' },
                    { label: 'NORMAL Proc', ms: normal, color: '#2563eb' },
                ]}
            />

            <div className="text-right">
                <button
                    onClick={() => mutate()}
                    className="text-xs px-3 py-1 bg-neutral-700 hover:bg-neutral-600 rounded"
                >
                    Refresh Now
                </button>
            </div>
        </div>
    );
}

function InfoCard({ label, value }: { label: string; value: any }) {
    return (
        <div className="p-3 rounded bg-neutral-800 flex flex-col gap-1">
      <span className="text-[10px] uppercase tracking-wide text-neutral-400">
        {label}
      </span>
            <span className="font-semibold text-sm break-all">{value}</span>
        </div>
    );
}