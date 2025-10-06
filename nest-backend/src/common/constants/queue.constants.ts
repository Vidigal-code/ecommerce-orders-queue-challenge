export const QUEUE_NAMES = {
  ORDER_GENERATION: 'order_generation_queue',
  ORDER_PROCESSING: 'order_processing_queue',
};

export const QUEUE_OPTIONS = {
  DEFAULT: {
    attempts: 3,
    backoff: 5000,
  },
  VIP: {
    attempts: 5,
    backoff: 3000,
  },
};