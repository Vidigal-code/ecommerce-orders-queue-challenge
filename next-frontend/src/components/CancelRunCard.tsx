'use client';
import { useState } from 'react';
import { api } from '@/lib/api';

export function CancelRunCard({ onDone }: { onDone?: () => void }) {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    async function cancel() {
        if (!confirm('Abort current run? This purges queue and removes pending orders.')) return;
        setLoading(true);
        setError(null);
        try {
            const res = await api.cancel({
                purge: true,
                removePending: true,
                resetLogs: false
            });
            setResult(res);
            onDone?.();
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }
    return (
        <div className="p-4 rounded-lg bg-neutral-900 border border-neutral-700 space-y-2">
            <h3 className="font-semibold text-red-400">Cancel Active Run</h3>
            <p className="text-xs text-neutral-400">
                Aborts generation + processing. Purges queue and deletes pending orders.
            </p>
            <button
                onClick={cancel}
                disabled={loading}
                className="bg-red-600 hover:bg-red-500 px-4 py-2 rounded font-medium disabled:opacity-50"
            >
                {loading ? 'Cancelling...' : 'Abort & Purge'}
            </button>
            {error && <p className="text-red-400 text-xs">{error}</p>}
            {result && (
                <pre className="mt-2 text-[11px] bg-neutral-800 p-2 rounded overflow-auto max-h-40">
          {JSON.stringify(result, null, 2)}
        </pre>
            )}
        </div>
    );
}