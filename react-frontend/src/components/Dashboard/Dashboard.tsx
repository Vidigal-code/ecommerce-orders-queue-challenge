import React, { useEffect, useState } from 'react';
import { fetchOrderMetrics } from '../../services/api.service';
import { useWebSocket } from '../../hooks/useWebSocket';
import MetricsCard from './MetricsCard';
import ProgressBar from './ProgressBar';
import PhaseIndicator from './PhaseIndicator';
import LiveLog from './LiveLog';

const Dashboard: React.FC = () => {
    const [metrics, setMetrics] = useState(null);
    const [loading, setLoading] = useState(true);
    const { sendMessage, onMessage } = useWebSocket();

    useEffect(() => {
        const fetchMetrics = async () => {
            const data = await fetchOrderMetrics();
            setMetrics(data);
            setLoading(false);
        };

        fetchMetrics();

        onMessage((message) => {
            const updatedMetrics = JSON.parse(message.data);
            setMetrics(updatedMetrics);
        });

        return () => {
            // Cleanup WebSocket connection if necessary
        };
    }, [onMessage]);

    if (loading) {
        return <div>Loading...</div>;
    }

    return (
        <div className="dashboard">
            <h1>Order Processing Dashboard</h1>
            <MetricsCard metrics={metrics} />
            <ProgressBar progress={metrics.progress} />
            <PhaseIndicator phase={metrics.currentPhase} />
            <LiveLog logs={metrics.logs} />
        </div>
    );
};

export default Dashboard;