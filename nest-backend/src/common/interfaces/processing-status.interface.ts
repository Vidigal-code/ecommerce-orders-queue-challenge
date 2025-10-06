export interface ProcessingStatus {
    orderId: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    priority: 'normal' | 'vip';
    startTime: Date;
    endTime?: Date;
    observations?: string;
}