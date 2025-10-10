'use client';
import { useWebSocket } from '@/hooks/useWebSocket';
import useSWR from 'swr';
import { api } from '@/lib/api';
import { LogMessage } from '@/lib/types';

export function LogsViewer({ lines = 300 }: { lines?: number }) {
    const { logs: wsLogs, isConnected } = useWebSocket();
    const { data, mutate, isLoading } = useSWR(['logs', lines], () => api.logs(lines), {
        refreshInterval: 12000,
    });

    // Use WebSocket logs as primary, fall back to polled logs
    const logMessages: LogMessage[] = wsLogs.filter((log: LogMessage) => log.level === 'log').slice(-lines);
    const warnMessages: LogMessage[] = wsLogs.filter((log: LogMessage) => log.level === 'warn').slice(-lines);
    const errorMessages: LogMessage[] = wsLogs.filter((log: LogMessage) => log.level === 'error').slice(-lines);

    // If no WebSocket logs, use polled logs
    const fallbackLogMessages: string[] = data?.logs.logMessages.slice(-lines) || [];
    const fallbackWarnMessages: string[] = data?.logs.warnMessages.slice(-lines) || [];
    const fallbackErrorMessages: string[] = data?.logs.errorMessages.slice(-lines) || [];

    const displayLogMessages: LogMessage[] = logMessages.length > 0 ? logMessages : fallbackLogMessages.map((msg: string) => ({
        timestamp: Date.parse(msg.split('[')[1]?.split(']')[0] || new Date().toISOString()),
        level: 'log' as const,
        message: msg.split('] ')[1] || msg,
        category: 'system'
    }));
    const displayWarnMessages: LogMessage[] = warnMessages.length > 0 ? warnMessages : fallbackWarnMessages.map((msg: string) => ({
        timestamp: Date.parse(msg.split('[')[1]?.split(']')[0] || new Date().toISOString()),
        level: 'warn' as const,
        message: msg.split('] ')[1] || msg,
        category: 'system'
    }));
    const displayErrorMessages: LogMessage[] = errorMessages.length > 0 ? errorMessages : fallbackErrorMessages.map((msg: string) => ({
        timestamp: Date.parse(msg.split('[')[1]?.split(']')[0] || new Date().toISOString()),
        level: 'error' as const,
        message: msg.split('] ')[1] || msg,
        category: 'system'
    }));

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
                <h2 className="text-lg font-semibold">
                    Logs (last {lines})
                    {isConnected && <span className="ml-2 text-green-400 text-sm">● Live</span>}
                </h2>
                <button
                    onClick={() => mutate()}
                    className="text-xs bg-neutral-700 hover:bg-neutral-600 px-3 py-1 rounded"
                >
                    Refresh Logs
                </button>
            </div>
            {isLoading && wsLogs.length === 0 && <p className="text-sm text-neutral-400">Loading logs...</p>}
            <div className="grid md:grid-cols-3 gap-4">
                <LogBlock title="Info" logs={displayLogMessages} />
                <LogBlock title="Warnings" logs={displayWarnMessages} />
                <LogBlock title="Errors" logs={displayErrorMessages} />
            </div>
            <div className="p-3 bg-neutral-900 border border-neutral-700 rounded text-xs space-y-1">
                <strong>Quick Stats:</strong>{' '}
                live={wsLogs.length} | polled={data ? data.logs.logMessages.length + data.logs.warnMessages.length + data.logs.errorMessages.length : 0}
            </div>
        </div>
    );
}

function LogBlock({ title, logs }: { title: string; logs: LogMessage[] }) {
    return (
        <div className="bg-neutral-900 border border-neutral-700 rounded p-2 overflow-auto max-h-[400px] text-[11px] leading-snug font-mono">
            <div className="sticky top-0 bg-neutral-900/90 backdrop-blur pb-1 mb-1 font-semibold">
                {title}
            </div>
            {logs.length === 0 && <div className="text-neutral-500">No logs.</div>}
            {logs.map((log, i) => (
                <div key={i} className="mb-1">
                    <span className="text-neutral-500">
                        {new Date(log.timestamp).toLocaleTimeString()}
                    </span>{' '}
                    {log.message}
                </div>
            ))}
        </div>
    );
}