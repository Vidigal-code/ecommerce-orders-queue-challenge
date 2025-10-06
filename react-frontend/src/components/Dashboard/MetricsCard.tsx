import React from 'react';

interface MetricsCardProps {
    title: string;
    value: number;
    description: string;
}

const MetricsCard: React.FC<MetricsCardProps> = ({ title, value, description }) => {
    return (
        <div className="metrics-card">
            <h3>{title}</h3>
            <p>{value}</p>
            <small>{description}</small>
        </div>
    );
};

export default MetricsCard;