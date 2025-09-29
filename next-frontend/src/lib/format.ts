import dayjs from 'dayjs';

export function ms(msValue: number): string {
    if (msValue === null || msValue === undefined) return '-';
    if (msValue < 1000) return `${msValue} ms`;
    const s = msValue / 1000;
    if (s < 60) return `${s.toFixed(2)} s`;
    const m = Math.floor(s / 60);
    const rest = (s % 60).toFixed(1);
    return `${m}m ${rest}s`;
}

export function isoFmt(v: string | null) {
    return v ? dayjs(v).format('YYYY-MM-DD HH:mm:ss') : '-';
}

export function numberFmt(n: number | undefined) {
    if (typeof n !== 'number') return '-';
    return n.toLocaleString('en-US');
}