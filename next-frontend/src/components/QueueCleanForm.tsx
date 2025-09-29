'use client';
import { useState } from 'react';
import { api } from '@/lib/api';

const STATES = ['wait','active','delayed','completed','failed'];

export function QueueCleanForm({ onDone }: { onDone?: () => void }) {
    const [state, setState] = useState('wait');
    const [loading, setLoading] = useState(false);
    const [res, setRes] = useState<any>(null);

    async function submit() {
        setLoading(true);
        try {
            const r = await api.clean(state);
            setRes(r);
            onDone?.();
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="p-4 bg-neutral-900 border border-neutral-700 rounded flex flex-col gap-2">
            <h3 className="font-semibold">Clean Queue State</h3>
            <div className="flex gap-2">
                <select
                    value={state}
                    onChange={e => setState(e.target.value)}
                    className="bg-neutral-800 border border-neutral-600 rounded px-2 py-1 text-sm"
                >
                    {STATES.map(s => <option key={s}>{s}</option>)}
                </select>
                <button
                    disabled={loading}
                    onClick={submit}
                    className="bg-neutral-700 hover:bg-neutral-600 px-3 py-1 text-sm rounded disabled:opacity-50"
                >
                    {loading ? 'Cleaning...' : 'Clean'}
                </button>
            </div>
            {res && (
                <pre className="text-[11px] bg-neutral-800 p-2 rounded overflow-auto max-h-40">
          {JSON.stringify(res, null, 2)}
        </pre>
            )}
        </div>
    );
}