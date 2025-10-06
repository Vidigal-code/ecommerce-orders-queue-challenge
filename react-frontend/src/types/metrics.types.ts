export interface Metrics {
    orderGenerationTime: number;
    processingTime: {
        vip: number;
        normal: number;
    };
    processingStartTime: {
        vip: Date;
        normal: Date;
    };
    processingEndTime: {
        vip: Date;
        normal: Date;
    };
    totalExecutionTime: number;
    ordersProcessed: {
        vip: number;
        normal: number;
    };
}