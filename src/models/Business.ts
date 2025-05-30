import mongoose, { Schema, Document } from 'mongoose';

export interface IBusiness extends Document {
  name: string;
  domainName: string;
  owner: mongoose.Types.ObjectId;
  industry: string;
  businessType: 'B2B' | 'B2C' | 'e-Commerce Store' | 'Other';
  platform: string;
  supportSize: string;
  supportChannels: string[];
  websiteTraffic: string;
  monthlyConversations: string;
  goals: string[];
  subscriptionPlan: 'free' | 'pro' | 'enterprise';
 
  createdAt: Date;
  updatedAt: Date;
}

const BusinessSchema = new Schema<IBusiness>(
  {
    name: { type: String, required: true },
    domainName: { type: String, required: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    industry: { type: String, required: true },
    businessType: { type: String, enum:  ['B2B', 'B2C', 'e-Commerce Store', 'Other'], required: true },
    platform: { type: String, required: true },
    supportSize: { type: String, required: true },
    supportChannels: { type: [String], required: true },
    websiteTraffic: { type: String, required: true },
    monthlyConversations: { type: String, required: true },
    goals: { type: [String], required: true },
    subscriptionPlan: { type: String, enum: ['free', 'pro', 'enterprise'], default: 'free' },

  },
  { timestamps: true }
);

BusinessSchema.index({
  name: 'text',
  domainName: 'text',
});


export default mongoose.model<IBusiness>('Business', BusinessSchema);
