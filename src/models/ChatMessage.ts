// src/models/ChatMessage.ts

import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IChatMessage extends Document {
  businessId: Types.ObjectId;
  agentId: Types.ObjectId | null;
  customerId: Types.ObjectId; // could be userId, sessionId, etc.
  sender: 'customer' | 'agent' | 'human';
  message: string;
  timestamp: Date;
}

const chatMessageSchema = new Schema<IChatMessage>({
  businessId: { type: Schema.Types.ObjectId, ref: 'Business', required: true },
  agentId: { type: Schema.Types.ObjectId, ref: 'Agent', required: false},
  customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
  sender: { type: String, enum: ['customer', 'agent', 'human'], required: true },
  message: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
});

// important for fast queries
chatMessageSchema.index({ businessId: 1, agentId: 1, customerId: 1, timestamp: 1 });

export const ChatMessage = mongoose.model<IChatMessage>('ChatMessage', chatMessageSchema);
