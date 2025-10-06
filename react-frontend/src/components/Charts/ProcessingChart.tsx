import React, { useEffect, useState } from 'react';
import { Line } from 'react-chartjs-2';
import { useOrderMetrics } from '../../hooks/useOrderMetrics';

const ProcessingChart = () => {
    const { metricsData } = useOrderMetrics();
    const [chartData, setChartData] = useState({});

    useEffect(() => {
        if (metricsData) {
            const labels = metricsData.map(metric => metric.timestamp);
            const vipData = metricsData.map(metric => metric.vipProcessed);
            const normalData = metricsData.map(metric => metric.normalProcessed);

            setChartData({
                labels: labels,
                datasets: [
                    {
                        label: 'VIP Orders Processed',
                        data: vipData,
                        borderColor: 'rgba(255, 215, 0, 1)',
                        backgroundColor: 'rgba(255, 215, 0, 0.2)',
                        fill: true,
                    },
                    {
                        label: 'Normal Orders Processed',
                        data: normalData,
                        borderColor: 'rgba(0, 123, 255, 1)',
                        backgroundColor: 'rgba(0, 123, 255, 0.2)',
                        fill: true,
                    },
                ],
            });
        }
    }, [metricsData]);

    return (
        <div>
            <h2>Order Processing Metrics</h2>
            <Line data={chartData} />
        </div>
    );
};

export default ProcessingChart;