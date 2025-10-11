// This is a server component page that renders client components inside
import { QueueStatsCard } from '@/components/QueueStatsCard';
import { JobsTable } from '@/components/JobsTable';
import { QueueControls } from '@/components/QueueControls';
import { QueueCleanForm } from '@/components/QueueCleanForm';
import { HealthPanel } from '@/components/HealthPanel';
import { RealTimeLogs } from '@/components/RealTimeLogs';
import { WorkersMonitor } from '@/components/WorkersMonitor';
import { ConnectionStatus } from '@/components/ConnectionStatus';

export const revalidate = 20;

import QueueErrorRecovery from '@/components/QueueErrorRecovery';

export default function QueuePage() {
    return (
        <main className="space-y-8">
            <h2 className="text-xl font-semibold">Queue Overview</h2>
            <div className="grid lg:grid-cols-3 gap-6">
                <div className="space-y-6 lg:col-span-2">
                    <HealthPanel />
                    <QueueStatsCard />
                    <WorkersMonitor />
                    <QueueControls />
                    <QueueCleanForm />
                    <JobsTable />
                </div>
                <aside className="space-y-4">
                    <ConnectionStatus showStats={true} />
                    
                    <RealTimeLogs 
                      title="Real-time Queue Logs" 
                      maxLogs={50}
                      autoScroll={true}
                    />
                    
                    <div className="p-4 rounded bg-neutral-900 border border-neutral-700 text-sm space-y-2">
                        <p className="font-semibold">Notes</p>
                        <p>
                            VIP jobs (priority=1) finish fully before NORMAL are enqueued.
                        </p>
                        <p>
                            Cleaning a state removes only that phase. Use Cancel or Reset for full purge.
                        </p>
                    </div>
                </aside>
            </div>
            {/* Error recovery dialog (client component controls visibility) */}
            <QueueErrorRecovery />
        </main>
    );
}