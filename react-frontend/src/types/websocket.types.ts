export interface WebSocketMessage {
  event: string;
  data: any;
}

export interface OrderUpdate {
  orderId: string;
  status: string;
  tier: string;
  observations: string;
}

export interface MetricsUpdate {
  totalOrdersProcessed: number;
  vipOrdersProcessed: number;
  normalOrdersProcessed: number;
  processingTime: number;
}