import { ReactNode } from 'react';

export function MetricCard({ title, value, hint }: { title: string; value: ReactNode; hint?: string }) {
    return (
        <div className="p-4 rounded-lg bg-neutral-900 border border-neutral-700 shadow flex flex-col gap-1">
            <div className="text-xs uppercase tracking-wider text-neutral-400">
                {title}
            </div>
            <div className="text-lg font-semibold break-all">{value}</div>
            {hint && (
                <div className="text-[10px] leading-tight text-neutral-500">{hint}</div>
            )}
        </div>
    );
}