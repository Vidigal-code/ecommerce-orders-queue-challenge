import { LogsViewer } from '@/components/LogsViewer';

export const revalidate = 30;

export default function LogsPage() {
    return (
        <main className="space-y-8">
            <LogsViewer lines={300} />
        </main>
    );
}