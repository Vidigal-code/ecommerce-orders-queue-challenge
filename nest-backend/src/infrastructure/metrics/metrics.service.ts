import { Injectable } from '@nestjs/common';
import client from 'prom-client';

@Injectable()
export class MetricsService {
  private enabled = process.env.PROMETHEUS_METRICS === 'true';

  public readonly registry: client.Registry;
  public readonly ordersGenerated: client.Counter<string>;
  public readonly ordersProcessed: client.Counter<string>;
  public readonly processingDuration: client.Histogram<string>;
  public readonly queueGauge: client.Gauge<string>;

  constructor() {
    this.registry = new client.Registry();
    if (!this.enabled) return;

    client.collectDefaultMetrics({ register: this.registry });

    this.ordersGenerated = new client.Counter({
      name: 'orders_generated_total',
      help: 'Total de pedidos gerados',
      registers: [this.registry],
    });

    this.ordersProcessed = new client.Counter({
      name: 'orders_processed_total',
      help: 'Total de pedidos processados',
      labelNames: ['priority'],
      registers: [this.registry],
    });

    this.processingDuration = new client.Histogram({
      name: 'order_processing_duration_ms',
      help: 'Duração do processamento (ms) (janela VIP/NORMAL aproximada)',
      buckets: [50, 100, 250, 500, 1000, 2000, 5000],
      labelNames: ['priority'],
      registers: [this.registry],
    });

    this.queueGauge = new client.Gauge({
      name: 'orders_queue_counts',
      help: 'Contadores brutos da fila',
      labelNames: ['type'],
      registers: [this.registry],
    });
  }

  incGenerated(by: number) {
    if (!this.enabled) return;
    this.ordersGenerated.inc(by);
  }

  incProcessed(priority: string) {
    if (!this.enabled) return;
    this.ordersProcessed.inc({ priority }, 1);
  }

  observeProcessing(priority: string, ms: number) {
    if (!this.enabled) return;
    this.processingDuration.observe({ priority }, ms);
  }

  setQueueMetric(type: string, value: number) {
    if (!this.enabled) return;
    this.queueGauge.set({ type }, value);
  }

  async metricsText(): Promise<string> {
    if (!this.enabled) {
      return '# Metrics disabled\n';
    }
    return await this.registry.metrics();
  }
}
