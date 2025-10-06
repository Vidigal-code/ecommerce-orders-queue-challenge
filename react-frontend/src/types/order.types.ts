export interface Order {
    id: string;
    customer: string;
    amount: number;
    tier: 'BRONZE' | 'SILVER' | 'GOLD' | 'DIAMOND';
    observations: string;
    priority: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface ProcessedOrder extends Order {
    status: 'sent with priority' | 'processed without priority';
    processingTime: number;
}