export interface Order {
    id: string;
    customer: string;
    amount: number;
    tier: 'BRONZE' | 'SILVER' | 'GOLD' | 'DIAMOND';
    observations: string;
    priority?: boolean;
    createdAt: Date;
    updatedAt: Date;
}