'use client';
import { useState } from 'react';
import { api } from '@/lib/api';

export function ResetSystemCard({ onDone }: { onDone?: () => void }) {
    const [loading, setLoading] = useState(false);
    const [res, setRes] = useState<any>(null);
    const [err, setErr] = useState<string | null>(null);

    async function reset() {
        if (!confirm('This will clear orders, queue, logs and run history. Continue?')) return;
        setLoading(true);
        setErr(null);
        try {
            const r = await api.reset();
            setRes(r);
            onDone?.();
        } catch (e: any) {
            setErr(e.message);
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