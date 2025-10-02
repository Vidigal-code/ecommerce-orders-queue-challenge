import { QueueStatsCard } from '@/components/QueueStatsCard';
import { JobsTable } from '@/components/JobsTable';
import { QueueControls } from '@/components/QueueControls';
import { QueueCleanForm } from '@/components/QueueCleanForm';
import { HealthPanel } from '@/components/HealthPanel';

export const revalidate = 20;

export default function QueuePage() {
    return (
        <main className="space-y-8">
            <h2 className="text-xl font-semibold">Queue Overview</h2>
            <div className="grid lg:grid-cols-3 gap-6">
                <div className="space-y-6 lg:col-span-2">
                    <HealthPanel />
                    <QueueStatsCard />
                    <QueueControls />
                    <QueueCleanForm />
                    <JobsTable />
                </div>
                <aside className="space-y-4">
                    <div className="p-4 rounded bg-neutral-900 border border-neutral-700 text-sm space-y-2">
                        <p className="font-semibold">Notes</p>
                        <p>
                            VIP jobs (priority=1) finish fully before NORMAL are enqueued.
                        </p>
                        <p>
                            Cleaning a state removes only that phase. Use Cancel or Reset for full purge.
                        </p>
                        <p className="mt-2 text-amber-400">
                            Se a fila aparecer travada, verifique jobs com falha e use a opção &quot;Reprocessar jobs com falha&quot;
                            que aparecerá quando houver falhas detectadas.
                        </p>
                    </div>
                </aside>
            </div>
        </main>
    );
}