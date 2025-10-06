import { Schema, Document } from 'mongoose';
import { Tier } from '../../common/enums/tier.enum';
import { Priority } from '../../common/enums/priority.enum';

export interface Order extends Document {
  id: string;
  customer: string;
  amount: number;
  tier: Tier;
  observations: string;
  priority: Priority;
  createdAt: Date;
  updatedAt: Date;
}

const OrderSchema = new Schema<Order>({
  id: { type: String, required: true, unique: true },
  customer: { type: String, required: true },
  amount: { type: Number, required: true },
  tier: { type: String, enum: Object.values(Tier), required: true },
  observations: { type: String, default: '' },
  priority: { type: String, enum: Object.values(Priority), required: true },
}, {
  timestamps: true,
});

export default OrderSchema;