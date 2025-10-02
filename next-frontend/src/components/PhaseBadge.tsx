'use client';
import clsx from 'clsx';
import { Phase } from '@/lib/types';

export function PhaseBadge({ phase }: { phase: Phase }) {
    const color =
        {
            IDLE: 'bg-neutral-600',
            GENERATING: 'bg-indigo-600',
            ENQUEUE_VIP: 'bg-amber-600',
            WAITING_VIP_DRAIN: 'bg-yellow-600',
            ENQUEUE_NORMAL: 'bg-blue-600',
            WAITING_NORMAL_DRAIN: 'bg-yellow-600',
            DONE: 'bg-green-600',
            ABORTED: 'bg-red-700',
            ERROR: 'bg-red-600',
        }[phase] || 'bg-neutral-500';

    return (
        <span
            className={clsx(
                'px-3 py-1 rounded text-xs font-semibold tracking-wide shadow text-white',
                color,
            )}
        >
      {phase}
    </span>
    );
}