import mongoose, { Schema, Document } from 'mongoose';

export interface IAgent extends Document {
  name: string;
  business: mongoose.Types.ObjectId;
  aiModel: mongoose.Types.ObjectId;
  responseTemplates: Record<string, any>;
  integrationOptions?: string[];
  intregatedDomains?: string[];
  intregatedWhatsApps?: string[];
  personality: {
    tone: 'formal' | 'friendly' | 'neutral';
    instruction?: string;
  };
  fallbackBehavior?: {
    enabled: boolean;
    forwardToHuman: boolean;
    fallbackMessage: string;
  };
  analytics?: {
    totalConversations: number;
    avgResponseTime: number;
    customerSatisfaction: number;
  };
  active?: boolean;
  languageSupport?: string[];
  createdAt: Date;
  updatedAt: Date;
}

const AgentSchema = new Schema<IAgent>(
  {
    name: { type: String, required: true },
    business: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
    aiModel: { type: mongoose.Schema.Types.ObjectId, ref: 'AIModel', required: true },
    responseTemplates: { type: Schema.Types.Mixed, required: true },
    integrationOptions: { type: [String], default:["website"]}, //for premium subscription allow whatsapp also
    intregatedDomains: { type: [String], default: [] },
    intregatedWhatsApps: { type: [String], default: [] },
    personality: {
      tone: {
        type: String,
        enum: ['formal', 'friendly', 'neutral'],
        default: 'friendly',
      },
      instruction: { type: String },
    },

    fallbackBehavior: {
      enabled: { type: Boolean, default: true },
      forwardToHuman: { type: Boolean, default: true },
      fallbackMessage: {
        type: String,
        default: 'Let me connect you to a human.',
      },
    },

    analytics: {
      totalConversations: { type: Number, default: 0 },
      avgResponseTime: { type: Number, default: 0 },
      customerSatisfaction: { type: Number, default: 0 },
    },

    active: { type: Boolean, default: false },
    languageSupport: { type: [String], default: ['en', 'es', 'bn'] },
  },
  { timestamps: true }
);

AgentSchema.index({ business: 1 });
AgentSchema.index({ name: 1, business: 1 }, { unique: true });

export default mongoose.model<IAgent>('Agent', AgentSchema);
