'use client';
import { useState } from 'react';
import { api } from '@/lib/api';

export function QueueControls({ onAction }: { onAction?: () => void }) {
    const [loading, setLoading] = useState<string | null>(null);
    async function action(fn: () => Promise<void>, tag: string) {
        setLoading(tag);
        try { await fn(); onAction?.(); } catch {}
        setLoading(null);
    }
    return (
        <div className="p-4 rounded bg-neutral-900 border border-neutral-700 flex flex-col gap-2">
            <h3 className="font-semibold">Queue Controls</h3>
            <div className="flex flex-wrap gap-2">
                <button
                    onClick={() => action(api.pause, 'pause')}
                    disabled={loading !== null}
                    className="px-3 py-1 text-sm bg-neutral-700 hover:bg-neutral-600 rounded"
                >
                    {loading === 'pause' ? '...' : 'Pause'}
                </button>
                <button
                    onClick={() => action(api.resume, 'resume')}
                    disabled={loading !== null}
                    className="px-3 py-1 text-sm bg-neutral-700 hover:bg-neutral-600 rounded"
                >
                    {loading === 'resume' ? '...' : 'Resume'}
                </button>
            </div>
        </div>
    );
}