import { Phase } from './phase.types';

const PHASE_VALUES: Phase[] = [
  'IDLE',
  'GENERATING',
  'ENQUEUE_VIP',
  'WAITING_VIP_DRAIN',
  'ENQUEUE_NORMAL',
  'WAITING_NORMAL_DRAIN',
  'DONE',
  'ABORTED',
  'ERROR',
];

export function isPhase(value: string): value is Phase {
  return (PHASE_VALUES as string[]).includes(value);
}

export function toPhase(
  value: string | undefined | null,
  fallback: Phase = 'IDLE',
): Phase {
  if (!value) return fallback;
  return isPhase(value) ? value : fallback;
}
