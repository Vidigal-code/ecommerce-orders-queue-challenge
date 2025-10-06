'use client';
import { useState } from 'react';
import { api } from '@/lib/api';

export function GenerateForm({ onSuccess }: { onSuccess?: () => void }) {
    const [quantity, setQuantity] = useState(1000000);
    const [loading, setLoading] = useState(false);
    const [msg, setMsg] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    async function submit() {
        setLoading(true);
        setError(null);
        setMsg(null);
        try {
            const res = await api.generate(quantity);
            setMsg(res.message);
            onSuccess?.();
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : 'Unknown error');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="p-4 rounded-lg bg-neutral-900 border border-neutral-700 space-y-3">
            <h3 className="font-semibold">Generate Orders</h3>
            <div className="flex items-center gap-2 flex-wrap">
                <input
                    type="number"
                    value={quantity}
                    onChange={e => setQuantity(parseInt(e.target.value, 10))}
                    className="bg-neutral-800 border border-neutral-600 rounded px-3 py-2 w-48"
                    min={1}
                />
                <button
                    disabled={loading}
                    onClick={submit}
                    className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 px-4 py-2 rounded font-medium"
                >
                    {loading ? 'Starting...' : 'Start'}
                </button>
            </div>
            {msg && <p className="text-green-400 text-sm">{msg}</p>}
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <p className="text-[11px] text-neutral-500">
                Enqueues generation job (VIP first, then NORMAL).
            </p>
        </div>
    );
}