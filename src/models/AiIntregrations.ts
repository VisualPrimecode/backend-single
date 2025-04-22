import mongoose, { Schema, Document } from 'mongoose';

export interface IAiIntegrations extends Document {
  businessId: mongoose.Types.ObjectId;
  website: boolean;
  whatsapp: boolean;
  api: boolean;
  integrationDetails: {
    apiKey: string;
    status: 'active' | 'inactive';
    integrationTypes: Array<'website' | 'whatsapp' | 'api'>;
    configDetails?: Record<string, any>;
    limits: {
      maxWebsites: number;
      maxWhatsappNumbers: number;
      maxApiCalls: number;
      maxConversationsPerMonth: number;
    };
    usageStats: {
      websitesConnected: number;
      whatsappNumbersConnected: number;
      apiCallsMade: number;
      monthlyConversations: number;
    };
    existingDomains: string[];
    expiresAt?: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

// Sub-schema for integrationDetails
const IntegrationDetailsSchema = new Schema(
  {
    apiKey: { type: String, required: true, unique: true },
    status: { type: String, enum: ['active', 'inactive'], default: 'inactive' },
    integrationTypes: {
      type: [String],
      enum: ['website', 'whatsapp', 'api'],
      default: [],
    },
    configDetails: { type: Schema.Types.Mixed },
    limits: {
      maxWebsites: { type: Number, default: 1 },
      maxWhatsappNumbers: { type: Number, default: 1 },
      maxApiCalls: { type: Number, default: 1000 },
      maxConversationsPerMonth: { type: Number, default: 500 },
    },
    usageStats: {
      websitesConnected: { type: Number, default: 0 },
      whatsappNumbersConnected: { type: Number, default: 0 },
      apiCallsMade: { type: Number, default: 0 },
      monthlyConversations: { type: Number, default: 0 },
    },
    existingDomains: { type: [String], default: [] },
    expiresAt: { type: Date },
  },
  { _id: false } // Prevents Mongoose from creating a separate _id for this nested object
);

const AiIntegrationsSchema = new Schema<IAiIntegrations>(
  {
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business',
      required: true,
      unique: true,
    },
    website: { type: Boolean, default: false },
    whatsapp: { type: Boolean, default: false },
    api: { type: Boolean, default: false },
    integrationDetails: {
      type: IntegrationDetailsSchema,
      required: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model<IAiIntegrations>('AiIntegrations', AiIntegrationsSchema);
