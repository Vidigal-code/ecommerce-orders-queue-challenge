import { api } from '@/lib/api';
import { StatusDashboard } from '@/components/StatusDashboard';
import { GenerateForm } from '@/components/GenerateForm';
import { CancelRunCard } from '@/components/CancelRunCard';
import { ResetSystemCard } from '@/components/ResetSystemCard';
import { HealthPanel } from '@/components/HealthPanel';
import { QueueControls } from '@/components/QueueControls';
import { QueueCleanForm } from '@/components/QueueCleanForm';
import { QueueStatsCard } from '@/components/QueueStatsCard';
import { JobsTable } from '@/components/JobsTable';

export const revalidate = 15; // ISR

export default async function Page() {
    let status = null;
    try {
        status = await api.status();
    } catch {}

    return (
        <main className="space-y-8">
            <section className="grid gap-6 lg:grid-cols-3">
                <div className="space-y-6 lg:col-span-2">
                    <StatusDashboard initial={status} />
                    <HealthPanel />
                    <div className="grid md:grid-cols-2 gap-6">
                        <GenerateForm />
                        <CancelRunCard />
                        <ResetSystemCard />
                        <QueueControls />
                    </div>
                    <QueueCleanForm />
                    <JobsTable />
                </div>
                <div className="space-y-6">
                    <QueueStatsCard />
                    <div className="p-4 text-xs rounded bg-neutral-900 border border-neutral-700 space-y-2">
                        <p className="font-semibold">About</p>
                        <p>
                            Monitor a high-volume (1M+) order pipeline with strict VIP → NORMAL prioritization.
                        </p>
                        <p className="text-neutral-500">
                            Powered by the NestJS backend /pedidos API.
                        </p>
                    </div>
                </div>
            </section>
        </main>
    );
}