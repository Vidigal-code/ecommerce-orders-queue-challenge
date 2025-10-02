import { api } from '@/lib/api';
import { RunsResponse, ProcessRunSummary } from '@/lib/types';

export const revalidate = 30;

export default async function RunsPage() {
    let runsData: RunsResponse | null = null;
    try {
        runsData = await api.runs(25);
    } catch {}

    return (
        <main className="space-y-6">
            <h2 className="text-xl font-semibold">Runs (History)</h2>
            {!runsData && (
                <p className="text-sm text-neutral-500">
                    History endpoint not available or no runs recorded yet.
                </p>
            )}
            {runsData && (
                <div className="space-y-4">
                    <p className="text-xs text-neutral-400">
                        Showing last {runsData.count} (limit={runsData.limit}). New runs are appended at each
                        phase completion (partial + final persist).
                    </p>
                    <div className="overflow-auto rounded border border-neutral-800">
                        <table className="w-full text-sm">
                            <thead>
                            <tr className="bg-neutral-800/60 text-left">
                                <th className="p-2">Run ID</th>
                                <th className="p-2">Created</th>
                                <th className="p-2">Gen (ms)</th>
                                <th className="p-2">VIP Proc (ms)</th>
                                <th className="p-2">NORMAL Proc (ms)</th>
                                <th className="p-2">VIP Count</th>
                                <th className="p-2">NORMAL Count</th>
                                <th className="p-2">Total Time (ms)</th>
                                <th className="p-2">VIP Enq (ms)</th>
                                <th className="p-2">NORMAL Enq (ms)</th>
                            </tr>
                            </thead>
                            <tbody>
                            {runsData.runs.map((r: ProcessRunSummary, i: number) => (
                                <tr
                                    key={i}
                                    className="border-b border-neutral-800 hover:bg-neutral-800/40 text-xs"
                                >
                                    <td className="p-2 font-mono break-all">{r.runId || '-'}</td>
                                    <td className="p-2">
                                        {r.createdAt ? new Date(r.createdAt).toLocaleString() : '-'}
                                    </td>
                                    <td className="p-2">{r.generationTimeMs ?? 0}</td>
                                    <td className="p-2">{r.processingTimeVIPMs ?? 0}</td>
                                    <td className="p-2">{r.processingTimeNormalMs ?? 0}</td>
                                    <td className="p-2">{r.totalProcessedVIP ?? 0}</td>
                                    <td className="p-2">{r.totalProcessedNormal ?? 0}</td>
                                    <td className="p-2">{r.totalTimeMs ?? 0}</td>
                                    <td className="p-2">{r.enqueueVipTimeMs ?? 0}</td>
                                    <td className="p-2">{r.enqueueNormalTimeMs ?? 0}</td>
                                </tr>
                            ))}
                            {!runsData.runs.length && (
                                <tr>
                                    <td
                                        className="p-4 text-center text-neutral-500"
                                        colSpan={10}
                                    >
                                        No runs recorded.
                                    </td>
                                </tr>
                            )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </main>
    );
}