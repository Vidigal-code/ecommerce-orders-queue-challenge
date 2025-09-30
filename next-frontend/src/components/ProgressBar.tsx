'use client';

export function ProgressBar({
                                percent,
                                label,
                                height = 10,
                                color = 'linear-gradient(90deg,#6366f1,#2563eb)',
                            }: {
    percent: number;
    label?: string;
    height?: number;
    color?: string;
}) {
    const clamped = Math.min(100, Math.max(0, percent || 0));
    return (
        <div className="w-full space-y-1">
            {label && (
                <div className="flex justify-between text-[11px] text-neutral-400">
                    <span>{label}</span>
                    <span>{clamped.toFixed(2)}%</span>
                </div>
            )}
            <div
                className="w-full rounded bg-neutral-800 overflow-hidden"
                style={{ height }}
            >
                <div
                    className="h-full transition-all"
                    style={{
                        width: `${clamped}%`,
                        background: color,
                    }}
                />
            </div>
        </div>
    );
}