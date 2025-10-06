'use client';
import { useWebSocket } from '@/hooks/useWebSocket';
import { OrdersStatusDto } from '@/lib/types';
import { numberFmt, ms, etaFmt, percentFmt } from '@/lib/format';
import { PhaseBadge } from './PhaseBadge';
import { TimelineBar } from './TimelineBar';
import { ProgressBar } from './ProgressBar';
import { ThroughputPanel } from './ThroughputPanel';

export function StatusDashboard({ initial }: { initial: OrdersStatusDto | null }) {
    const { status, isConnected } = useWebSocket();

    const data = status || initial;

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
    const total = data.totalTimeMs;

    const progressPercent = data.eta?.progressPercent || 0;
    const processedTotal = data.progress?.processedTotal || 0;
    const target = data.progress?.target || 0;
    const remaining = target > 0 ? Math.max(0, target - processedTotal) : 0;

    return (
        <div className="p-4 rounded-lg bg-neutral-900 border border-neutral-700 space-y-5">
            <div className="flex flex-wrap gap-4 items-center justify-between">
                <h2 className="text-lg font-semibold">Execution Status</h2>
                <PhaseBadge phase={data.phase} />
            </div>

            <div className="grid gap-4 grid-cols-2 md:grid-cols-4 xl:grid-cols-8">
                <InfoCard label="VIP Processed" value={numberFmt(data.counts.vip)} />
                <InfoCard label="NORMAL Processed" value={numberFmt(data.counts.normal)} />
                <InfoCard label="Total Processed" value={numberFmt(processedTotal)} />
                <InfoCard label="Target" value={numberFmt(target)} />
                <InfoCard label="Remaining" value={numberFmt(remaining)} />
                <InfoCard label="Progress" value={percentFmt(progressPercent)} />
                <InfoCard label="ETA" value={etaFmt(data.eta?.estimatedMs ?? null)} />
                <InfoCard label="Last Run ID" value={data.lastRunId || '-'} />
            </div>

            <ProgressBar percent={progressPercent} label="Overall Progress" />

            <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-4">
                    <h3 className="text-sm font-semibold tracking-wide text-neutral-300">
                        Durations
                    </h3>
                    <div className="grid gap-3 grid-cols-2 lg:grid-cols-3">
                        <InfoCard label="Generation" value={ms(generation)} />
                        <InfoCard label="VIP Proc Window" value={ms(vip)} />
                        <InfoCard label="NORMAL Proc Window" value={ms(normal)} />
                        <InfoCard label="VIP Enqueue" value={ms(data.enqueueVipTimeMs)} />
                        <InfoCard label="NORMAL Enqueue" value={ms(data.enqueueNormalTimeMs)} />
                        <InfoCard label="Total Time" value={ms(total)} />
                    </div>
                </div>
                <div className="space-y-4">
                    <h3 className="text-sm font-semibold tracking-wide text-neutral-300">
                        Throughput
                    </h3>
                    <ThroughputPanel
                        vip={data.throughput.vip}
                        normal={data.throughput.normal}
                        overall={data.throughput.overall}
                    />
                </div>
            </div>

            <TimelineBar
                segments={[
                    { label: 'Generation', ms: generation, color: '#6366f1' },
                    { label: 'VIP Proc', ms: vip, color: '#d97706' },
                    { label: 'NORMAL Proc', ms: normal, color: '#2563eb' },
                ]}
            />

            <div className="text-right">
                <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    <span className="text-xs text-neutral-400">
                        {isConnected ? 'Live' : 'Disconnected'}
                    </span>
                </div>
            </div>
        </div>
    );
}

function InfoCard({ label, value }: { label: string; value: string | number | null | undefined }) {
    return (
        <div className="p-3 rounded bg-neutral-800 flex flex-col gap-1 border border-neutral-700">
      <span className="text-[10px] uppercase tracking-wide text-neutral-400">
        {label}
      </span>
            <span className="font-semibold text-sm break-all">{value ?? '-'}</span>
        </div>
    );
}