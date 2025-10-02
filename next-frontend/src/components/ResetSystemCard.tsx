'use client';
import { useState } from 'react';

type ResetResponse = { message?: string };

export function ResetSystemCard({ onReset }: { onReset?: () => Promise<ResetResponse> }) {
    const [loading, setLoading] = useState(false);
    const [res, setRes] = useState<ResetResponse | null>(null);
    const [err, setErr] = useState<string | null>(null);

    async function reset() {
        if (!confirm('This will clear orders, queue, logs and run history. Continue?')) return;
        if (!onReset) return;

        setLoading(true);
        setErr(null);
        try {
            const resPayload = await onReset();
            const message = resPayload && typeof resPayload === 'object' && 'message' in resPayload
                ? (resPayload.message as string | undefined)
                : undefined;
            setRes({ message: message ?? 'System reset successfully' });
        } catch (e) {
            setErr((e as Error).message || 'Failed to reset system');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="p-4 rounded-lg bg-neutral-900 border border-neutral-700 space-y-2">
            <h3 className="font-semibold">Reset System</h3>
            <p className="text-xs text-neutral-400">
                Clears DB + queue jobs + logs (in-memory) + run history.
            </p>
            <button
                onClick={reset}
                disabled={loading}
                className="bg-neutral-700 hover:bg-neutral-600 px-4 py-2 rounded font-medium disabled:opacity-50"
            >
                {loading ? 'Resetting...' : 'Reset'}
            </button>
            {err && <p className="text-red-400 text-xs">{err}</p>}
            {res && <p className="text-green-400 text-xs">{res.message}</p>}
        </div>
    );
}