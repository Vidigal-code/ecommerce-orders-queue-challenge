import { Schema, Document } from 'mongoose';

export interface ProcessingMetrics extends Document {
  orderCount: number;
  vipOrderCount: number;
  normalOrderCount: number;
  processingTime: number;
  generationTime: number;
  startTime: Date;
  endTime: Date;
}

const ProcessingMetricsSchema = new Schema<ProcessingMetrics>({
  orderCount: { type: Number, required: true },
  vipOrderCount: { type: Number, required: true },
  normalOrderCount: { type: Number, required: true },
  processingTime: { type: Number, required: true },
  generationTime: { type: Number, required: true },
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },
});

export default ProcessingMetricsSchema;