import mongoose from 'mongoose';

const transferredChatSchema = new mongoose.Schema(
  {
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
    businessId: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
    agentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Agent', required: false },
    lastMessage: { type: String },
    status: { type: String, enum: ['pending', 'active', 'resolved'], default: 'pending' },
  },
  { timestamps: true }
);

export default mongoose.model('TransferredChat', transferredChatSchema);
