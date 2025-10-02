import { z } from 'zod';

export const configSchema = z.object({
  MONGO_URI: z.string().min(1, 'MONGO_URI is required'),
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().default(6379),
  PORT: z.coerce.number().default(3000),
  BACKEND_LOGS: z.enum(['true', 'false']).default('false'),
  MAX_ORDERS: z.coerce.number().min(1).default(1_500_000),
  GENERATION_CHUNK_SIZE: z.coerce.number().min(100).default(10_000),
  NORMAL_ENQUEUE_BATCH_SIZE: z.coerce.number().min(100).default(10_000),
  ORDERS_QUEUE_CONCURRENCY: z.coerce.number().min(1).default(25),
  LOG_PROGRESS_EVERY_MS: z.coerce.number().min(200).default(5000),
  LOG_MEMORY: z.enum(['true', 'false']).default('false'),
  PROMETHEUS_METRICS: z.enum(['true', 'false']).default('false'),
  LOG_FLUSH_INTERVAL_MS: z.coerce.number().min(200).default(750),
  LOG_BUFFER_MAX: z.coerce.number().min(50).default(500),
  BULK_UPDATE_MODE: z.enum(['true', 'false']).default('false'),
});

export type AppConfig = z.infer<typeof configSchema>;

export function validateConfig(raw: Record<string, unknown>): AppConfig {
  const parsed = configSchema.safeParse(raw);
  if (!parsed.success) {
    console.error('Invalid configuration:', parsed.error.flatten().fieldErrors);
    process.exit(1);
  }
  return parsed.data;
}
