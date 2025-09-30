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

export function rateFmt(v: number | undefined) {
    if (!v || v <= 0) return '-';
    if (v < 1) return `${v.toFixed(3)} /s`;
    if (v < 10) return `${v.toFixed(2)} /s`;
    if (v < 100) return `${v.toFixed(1)} /s`;
    return `${Math.round(v)} /s`;
}

export function etaFmt(msValue: number | null) {
    if (msValue === null || msValue === undefined) return '-';
    if (msValue < 0) return '-';
    return ms(msValue);
}

export function percentFmt(v: number | undefined) {
    if (v === null || v === undefined || isNaN(v)) return '-';
    return `${v.toFixed(2)}%`;
}