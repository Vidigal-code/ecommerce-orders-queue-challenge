import React, { useEffect, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import { useOrderMetrics } from '../../hooks/useOrderMetrics';

const TierDistribution = () => {
    const { orderMetrics } = useOrderMetrics();
    const [chartData, setChartData] = useState({});

    useEffect(() => {
        if (orderMetrics) {
            const tiers = ['BRONZE', 'SILVER', 'GOLD', 'DIAMOND'];
            const tierCounts = tiers.map(tier => orderMetrics.filter(order => order.tier === tier).length);

            setChartData({
                labels: tiers,
                datasets: [
                    {
                        label: 'Order Distribution by Tier',
                        data: tierCounts,
                        backgroundColor: [
                            'rgba(255, 99, 132, 0.6)',
                            'rgba(54, 162, 235, 0.6)',
                            'rgba(255, 206, 86, 0.6)',
                            'rgba(75, 192, 192, 0.6)',
                        ],
                        borderColor: 'rgba(0, 0, 0, 1)',
                        borderWidth: 1,
                    },
                ],
            });
        }
    }, [orderMetrics]);

    return (
        <div>
            <h2>Order Tier Distribution</h2>
            <Bar data={chartData} options={{ responsive: true }} />
        </div>
    );
};

export default TierDistribution;