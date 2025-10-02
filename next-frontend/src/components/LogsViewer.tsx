'use client';
import useSWR from 'swr';
import { api } from '@/lib/api';

export function LogsViewer({ lines = 300 }: { lines?: number }) {
    const { data, mutate, isLoading } = useSWR(['logs', lines], () => api.logs(lines), {
        refreshInterval: 12000,
    });

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
                <h2 className="text-lg font-semibold">Logs (last {lines})</h2>
                <button
                    onClick={() => mutate()}
                    className="text-xs bg-neutral-700 hover:bg-neutral-600 px-3 py-1 rounded"
                >
                    Refresh Logs
                </button>
            </div>
            {isLoading && <p className="text-sm text-neutral-400">Loading logs...</p>}
            {data && (
                <>
                    <div className="grid md:grid-cols-3 gap-4">
                        <LogBlock title="Info" lines={data.logs.logMessages} />
                        <LogBlock title="Warnings" lines={data.logs.warnMessages} />
                        <LogBlock title="Errors" lines={data.logs.errorMessages} />
                    </div>
                    <div className="p-3 bg-neutral-900 border border-neutral-700 rounded text-xs space-y-1">
                        <strong>Quick Stats:</strong>{' '}
                        processed={data.quickStats.totalProcessed} | vip={data.quickStats.vipProcessed} | normal=
                        {data.quickStats.normalProcessed}
                    </div>
                </>
            )}
            {!isLoading && !data && <div className="text-xs text-neutral-500">No data.</div>}
        </div>
    );
}

function LogBlock({ title, lines }: { title: string; lines: string[] }) {
    return (
        <div className="bg-neutral-900 border border-neutral-700 rounded p-2 overflow-auto max-h-[400px] text-[11px] leading-snug font-mono">
            <div className="sticky top-0 bg-neutral-900/90 backdrop-blur pb-1 mb-1 font-semibold">
                {title}
            </div>
            {lines.length === 0 && <div className="text-neutral-500">No lines.</div>}
            {lines.map((l, i) => (
                <div key={i}>{l}</div>
            ))}
        </div>
    );
}