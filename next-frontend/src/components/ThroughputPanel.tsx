'use client';
import { rateFmt } from '@/lib/format';

export function ThroughputPanel({
                                    vip,
                                    normal,
                                    overall,
                                }: {
    vip: number;
    normal: number;
    overall: number;
}) {
    return (
        <div className="grid gap-2 md:grid-cols-3">
            <Metric label="VIP Throughput" value={rateFmt(vip)} hint="Pedidos VIP por segundo" />
            <Metric
                label="NORMAL Throughput"
                value={rateFmt(normal)}
                hint="Pedidos NORMAL por segundo"
            />
            <Metric label="Overall" value={rateFmt(overall)} hint="Total combinado por segundo" />
        </div>
    );
}

function Metric({
                    label,
                    value,
                    hint,
                }: {
    label: string;
    value: string;
    hint?: string;
}) {
    return (
        <div className="p-3 rounded bg-neutral-800 border border-neutral-700 flex flex-col gap-1">
      <span className="text-[10px] uppercase tracking-wide text-neutral-400">
        {label}
      </span>
            <span className="font-semibold text-sm">{value}</span>
            {hint && <span className="text-[10px] text-neutral-500">{hint}</span>}
        </div>
    );
}