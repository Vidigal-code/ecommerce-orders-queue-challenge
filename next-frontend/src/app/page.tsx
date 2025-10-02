'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { StatusDashboard } from '@/components/StatusDashboard';
import { GenerateForm } from '@/components/GenerateForm';
import { CancelRunCard } from '@/components/CancelRunCard';
import { ResetSystemCard } from '@/components/ResetSystemCard';
import { HealthPanel } from '@/components/HealthPanel';
import { QueueControls } from '@/components/QueueControls';
import { QueueCleanForm } from '@/components/QueueCleanForm';
import { QueueStatsCard } from '@/components/QueueStatsCard';
import { JobsTable } from '@/components/JobsTable';
import { OrdersStatusDto } from '@/lib/types';
import { useWebSocket } from '@/hooks/useWebSocket';

export default function Page() {
    const [initialStatus, setInitialStatus] = useState<OrdersStatusDto | null>(null);
    const {
        isConnected,
        logs,
        progress,
        status
    } = useWebSocket();

    const startGeneration = useCallback(async (q: number, force?: boolean) => {
        const result = await api.generate(q, { force });
        api.status().then(setInitialStatus).catch(() => {});
        return result;
    }, []);

    const cancelOperation = useCallback(async () => {
        const result = await api.cancel();
        api.status().then(setInitialStatus).catch(() => {});
        return result;
    }, []);

    const resetSystem = useCallback(async () => {
        const result = await api.reset();
        api.status().then(setInitialStatus).catch(() => {});
        return result;
    }, []);

    useEffect(() => {
        // Load initial status
        api.status().then(setInitialStatus).catch(() => {});
    }, []);

    return (
        <main className="space-y-8">
            {/* WebSocket Connection Status */}
            <div className={`p-4 rounded-lg border ${
                isConnected
                    ? 'bg-green-900/20 border-green-700 text-green-300'
                    : 'bg-red-900/20 border-red-700 text-red-300'
            }`}>
                <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${
                        isConnected ? 'bg-green-400' : 'bg-red-400'
                    }`} />
                    <span className="font-medium">
                        {isConnected ? 'Connected to Backend' : 'Disconnected from Backend'}
                    </span>
                </div>
                <p className="text-sm mt-1 opacity-75">
                    Real-time updates {isConnected ? 'enabled' : 'disabled'}
                </p>
            </div>

            <section className="grid gap-6 lg:grid-cols-3">
                <div className="space-y-6 lg:col-span-2">
                    <StatusDashboard
                        initial={initialStatus}
                        realTimeStatus={status}
                        realTimeProgress={progress}
                    />
                    <HealthPanel />

                    {/* Real-time Logs */}
                    <div className="p-6 rounded-lg bg-neutral-900 border border-neutral-700">
                        <h3 className="text-lg font-semibold mb-4">Real-time Logs</h3>
                        <div className="space-y-2 max-h-96 overflow-y-auto">
                            {logs.length === 0 ? (
                                <p className="text-neutral-500 text-sm">No logs yet...</p>
                            ) : (
                                logs.map((log, index) => (
                                    <div
                                        key={index}
                                        className={`p-2 rounded text-sm font-mono ${
                                            log.level === 'error'
                                                ? 'bg-red-900/20 border border-red-700 text-red-300'
                                                : log.level === 'warn'
                                                ? 'bg-yellow-900/20 border border-yellow-700 text-yellow-300'
                                                : 'bg-neutral-800 text-neutral-300'
                                        }`}
                                    >
                                        <span className="text-xs opacity-75">
                                            {new Date(log.timestamp).toLocaleTimeString()}
                                        </span>
                                        <span className={`ml-2 px-1 py-0.5 rounded text-xs ${
                                            log.level === 'error' ? 'bg-red-700' :
                                            log.level === 'warn' ? 'bg-yellow-700' :
                                            'bg-neutral-700'
                                        }`}>
                                            {log.level.toUpperCase()}
                                        </span>
                                        <span className="ml-2">{log.message}</span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                        <GenerateForm onStartGeneration={startGeneration} />
                        <CancelRunCard onCancel={cancelOperation} />
                        <ResetSystemCard onReset={resetSystem} />
                        <QueueControls />
                    </div>
                    <QueueCleanForm />
                    <JobsTable />
                </div>
                <div className="space-y-6">
                    <QueueStatsCard />
                    <div className="p-4 text-xs rounded bg-neutral-900 border border-neutral-700 space-y-2">
                        <p className="font-semibold">About</p>
                        <p>
                            Monitor a high-volume (1M+) order pipeline with strict VIP → NORMAL prioritization.
                        </p>
                        <p className="text-neutral-500">
                            Powered by the NestJS backend /pedidos API with real-time WebSocket updates.
                        </p>
                    </div>
                </div>
            </section>
        </main>
    );
}