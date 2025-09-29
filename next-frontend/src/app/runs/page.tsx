export const revalidate = 60;

export default function RunsPage() {
    return (
        <main className="space-y-6">
            <h2 className="text-xl font-semibold">Runs (History)</h2>
            <p className="text-sm text-neutral-400">
                Execution history is recorded in the backend (process_runs). Add a new endpoint
                (e.g. GET /pedidos/runs) to list past runs and render them here.
            </p>
            <div className="p-4 bg-neutral-900 border border-neutral-700 rounded text-sm">
                <em>Future:</em> timeline of previous runs, durations, processed counts.
            </div>
        </main>
    );
}