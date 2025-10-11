'use client';
import React, { useEffect, useState, useMemo } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { OrdersStatusDto, QueueStats } from '@/lib/types';
import { numberFmt, ms, etaFmt, percentFmt } from '@/lib/format';
import { PhaseBadge } from './PhaseBadge';
import { TimelineBar } from './TimelineBar';
import { ProgressBar } from './ProgressBar';
import { ThroughputPanel } from './ThroughputPanel';
import { ProcessVisualizer } from './ProcessVisualizer';
import { QueueStatsDisplay } from './QueueStatsDisplay';

export function StatusDashboard({ initial }: { initial: OrdersStatusDto | null }) {
    const { status, isConnected, reconnect, lastActivity } = useWebSocket();
    const [updateTimestamp, setUpdateTimestamp] = useState<number>(Date.now());
    const [dataAge, setDataAge] = useState<number>(0);
    const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);

    // Calculate data freshness
    useEffect(() => {
        const interval = setInterval(() => {
            setUpdateTimestamp(Date.now());
            if (lastActivity) {
                setDataAge(Date.now() - lastActivity);
                setLastUpdateTime(new Date(lastActivity));
            }
        }, 1000);
        return () => clearInterval(interval);
    }, [lastActivity]);

    const data = status || initial;
    
    // Calculate queue stats from available data
    const queueStats = useMemo<QueueStats | null>(() => {
        if (!data) return null;
        
        return {
            waiting: data.progress.target - data.progress.processedTotal,
            waitingVip: Math.max(0, data.counts.vip - (data.processing.vip.count || 0)),
            waitingRegular: Math.max(0, data.counts.normal - (data.processing.normal.count || 0)),
            active: Math.min(10, data.progress.target - data.progress.processedTotal > 0 ? 10 : 0), // Approximate with workers
            completed: data.progress.processedTotal,
            failed: 0, // Not available directly, using 0
            delayed: 0, // Not available directly, using 0
            paused: data.phase === 'IDLE', // Infer from phase
            workers: 10, // Hardcoded for demonstration, should come from server
            processedTotal: data.progress.processedTotal,
            elapsedTimeSeconds: Math.floor(data.totalTimeMs / 1000)
        };
    }, [data]);

    if (!data) {
        return (
            <div className="p-4 bg-neutral-900 border border-neutral-700 rounded-lg space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold">Execution Status</h2>
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-red-500"></div>
                        <span className="text-xs text-neutral-400">Disconnected</span>
                    </div>
                </div>
                <div className="text-center py-8">
                    <p className="text-neutral-400 mb-4">Status data not available. Please check your connection.</p>
                    <button 
                        onClick={() => reconnect()}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm transition"
                    >
                        Retry Connection
                    </button>
                </div>
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
            
            {/* Enhanced real-time visualization */}
            <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
                {/* Process Visualization */}
                <ProcessVisualizer phase={data.phase} />
                
                {/* Queue Stats */}
                {queueStats && (
                    <QueueStatsDisplay 
                        stats={queueStats}
                        isConnected={isConnected}
                        lastUpdated={lastUpdateTime}
                    />
                )}
            </div>

            {/* Real-time updates section */}
            <div className="flex flex-wrap justify-between items-center gap-4 pt-2 border-t border-neutral-700">
                <div>
                    {data.phase !== 'IDLE' && data.phase !== 'DONE' && data.phase !== 'ERROR' && (
                        <div className="flex items-center">
                            <div className="animate-pulse mr-2 w-3 h-3 rounded-full bg-blue-500"></div>
                            <span className="text-xs text-blue-400">Processing...</span>
                        </div>
                    )}
                </div>
                
                <div className="flex items-center gap-4">
                    {dataAge > 0 && (
                        <span className="text-xs text-neutral-400">
                            Last update: {dataAge < 60000 ? `${Math.floor(dataAge / 1000)}s ago` : `${Math.floor(dataAge / 60000)}m ago`}
                        </span>
                    )}
                    
                    <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                        <span className="text-xs text-neutral-400">
                            {isConnected ? 'Live' : 'Disconnected'}
                        </span>
                        {!isConnected && (
                            <button
                                onClick={() => reconnect()}
                                className="ml-2 text-xs bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded transition"
                            >
                                Reconnect
                            </button>
                        )}
                    </div>
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