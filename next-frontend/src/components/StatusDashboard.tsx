'use client';
import React from 'react';
import useSWR from 'swr';
import { api } from '@/lib/api';
import { OrdersStatusDto, Phase } from '@/lib/types';
import { numberFmt, ms, etaFmt, percentFmt } from '@/lib/format';
import { PhaseBadge } from './PhaseBadge';
import { TimelineBar } from './TimelineBar';
import { ProgressBar } from './ProgressBar';
import { ThroughputPanel } from './ThroughputPanel';

import { StatusUpdate, ProgressUpdate } from '@/hooks/useWebSocket';

export function StatusDashboard({
    initial,
    realTimeStatus,
    realTimeProgress
}: {
    initial: OrdersStatusDto | null;
    realTimeStatus?: StatusUpdate | null;
    realTimeProgress?: ProgressUpdate | null;
}) {
    const { data, mutate } = useSWR('status', api.status, {
        fallbackData: initial || undefined,
        refreshInterval: 6000,
    });

    // Show loading state if no data available
    if (!data) {
        return (
            <div className="p-4 rounded-lg bg-neutral-900 border border-neutral-700">
                <div className="text-center text-neutral-400">Loading status...</div>
            </div>
        );
    }

    // Use real-time data if available, otherwise fall back to polled data
    const currentData = realTimeStatus ? {
        ...data,
        phase: realTimeStatus.phase,
        // Merge other real-time data as needed
    } : data;

    // Extract values from the appropriate data source
    const generation = currentData.generationTimeMs;
    const vip = currentData.processing.vip.timeMs;
    const normal = currentData.processing.normal.timeMs;
    const total = currentData.totalTimeMs;

    // Handle progress data - realTimeProgress has different structure than OrdersStatusDto
    const progressPercent = realTimeProgress?.progress ?? data.eta?.progressPercent ?? 0;
    const processedTotal = realTimeProgress?.current ?? data.progress?.processedTotal ?? 0;
    const target = realTimeProgress?.total ?? data.progress?.target ?? 0;
    const remaining = target > 0 ? Math.max(0, target - processedTotal) : 0;

    return (
        <div className="p-4 rounded-lg bg-neutral-900 border border-neutral-700 space-y-5">
            <div className="flex flex-wrap gap-4 items-center justify-between">
                <h2 className="text-lg font-semibold">Execution Status</h2>
                <PhaseBadge phase={currentData.phase as Phase} />
            </div>

            <div className="grid gap-4 grid-cols-2 md:grid-cols-4 xl:grid-cols-8">
                <InfoCard label="VIP Processed" value={numberFmt(currentData.counts.vip)} />
                <InfoCard label="NORMAL Processed" value={numberFmt(currentData.counts.normal)} />
                <InfoCard label="Total Processed" value={numberFmt(processedTotal)} />
                <InfoCard label="Target" value={numberFmt(target)} />
                <InfoCard label="Remaining" value={numberFmt(remaining)} />
                <InfoCard label="Progress" value={percentFmt(progressPercent)} />
                <InfoCard label="ETA" value={etaFmt(currentData.eta?.estimatedMs ?? null)} />
                <InfoCard label="Last Run ID" value={currentData.lastRunId || '-'} />
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
                        <InfoCard label="VIP Enqueue" value={ms(currentData.enqueueVipTimeMs)} />
                        <InfoCard label="NORMAL Enqueue" value={ms(currentData.enqueueNormalTimeMs)} />
                        <InfoCard label="Total Time" value={ms(total)} />
                    </div>
                </div>
                <div className="space-y-4">
                    <h3 className="text-sm font-semibold tracking-wide text-neutral-300">
                        Throughput
                    </h3>
                    <ThroughputPanel
                        vip={currentData.throughput.vip}
                        normal={currentData.throughput.normal}
                        overall={currentData.throughput.overall}
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

function InfoCard({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div className="p-3 rounded bg-neutral-800 flex flex-col gap-1 border border-neutral-700">
      <span className="text-[10px] uppercase tracking-wide text-neutral-400">
        {label}
      </span>
            <span className="font-semibold text-sm break-all">{value}</span>
        </div>
    );
}