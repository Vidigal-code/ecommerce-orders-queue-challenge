'use client';
import { useState } from 'react';
import type { CancelResult } from '@/lib/types';

type CancelResponse = CancelResult | { message?: string };

export function CancelRunCard({ onCancel }: { onCancel?: () => Promise<CancelResponse> }) {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<CancelResponse | null>(null);
    const [error, setError] = useState<string | null>(null);

    async function cancel() {
        if (!confirm('Abort current run? This purges queue and removes pending orders.')) return;
        if (!onCancel) return;

        setLoading(true);
        setError(null);
        try {
            const res = await onCancel();
            setResult(res ?? { success: true, message: 'Operation cancelled successfully' });
        } catch (e) {
            setError((e as Error).message || 'Failed to cancel operation');
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