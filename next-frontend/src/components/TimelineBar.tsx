'use client';
import { ms } from '@/lib/format';

interface Segment {
    label: string;
    ms: number;
    color: string;
}

export function TimelineBar({ segments }: { segments: Segment[] }) {
    const total = segments.reduce((a, s) => a + s.ms, 0) || 1;
    return (
        <div className="w-full">
            <div className="flex h-4 overflow-hidden rounded">
                {segments.map((s, i) => {
                    const pct = (s.ms / total) * 100;
                    return (
                        <div
                            key={i}
                            style={{ width: `${pct}%`, background: s.color }}
                            className="transition-all"
                            title={`${s.label}: ${ms(s.ms)} (${pct.toFixed(1)}%)`}
                        />
                    );
                })}
            </div>
            <div className="mt-2 flex gap-4 flex-wrap text-[11px] text-neutral-400">
                {segments.map((s, i) => (
                    <span key={i} className="flex items-center gap-1">
            <span
                className="inline-block w-3 h-3 rounded-sm"
                style={{ background: s.color }}
            />
                        {s.label}: {ms(s.ms)}
          </span>
                ))}
            </div>
        </div>
    );
}