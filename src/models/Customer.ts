// src/models/Customer.ts

import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ICustomer extends Document {
  businessId: Types.ObjectId;
  agentId?: Types.ObjectId;
  name?: string;
  email?: string;
  phone?: string;
  latestMessage?: string;
  latestMessageTimestamp?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const customerSchema = new Schema<ICustomer>({
  businessId: { type: Schema.Types.ObjectId, ref: 'Business', required: true },
  agentId: { type: Schema.Types.ObjectId, ref: 'Agent' },
  name: { type: String },
  email: { type: String },
  latestMessage: { type: String },
  latestMessageTimestamp: { type: Date },
  phone: { type: String },
}, { timestamps: true });

// important for search
customerSchema.index({
  name: 'text',
  phone: 'text',
  email: 'text',
},
  { weights: { name: 1, phone: 3, email: 2 } }
);

export const Customer = mongoose.model<ICustomer>('Customer', customerSchema);
