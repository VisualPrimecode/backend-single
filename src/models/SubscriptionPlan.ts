import mongoose, { Schema, Document } from 'mongoose';

export interface ISubscriptionPlan extends Document {
  name: 'free' | 'pro' | 'enterprise';
  label: string;
  description?: string;
  price: number;
  currency: string;
  interval: 'month' | 'year';
  trialDays: number;
  features: {
    label: string;
    key: string;
    value: string | number | boolean;
  }[];
  isActive: boolean;
  isPublic: boolean;
  sortOrder: number;
  stripeProductId?: string;
  stripePriceId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SubscriptionPlanSchema = new Schema<ISubscriptionPlan>(
  {
    name: {
      type: String,
      enum: ['free', 'pro', 'enterprise'],
      required: true,
      unique: true,
    },
    label: {
      type: String,
      required: true,
    },
    description: { type: String },

    price: {
      type: Number,
      required: true,
      default: 0,
    },
    currency: {
      type: String,
      required: true,
      default: 'usd',
    },
    interval: {
      type: String,
      enum: ['month', 'year'],
      default: 'month',
    },

    trialDays: {
      type: Number,
      default: 0,
    },

    features: [
      {
        label: { type: String, required: true },
        key: { type: String, required: true },
        value: { type: Schema.Types.Mixed, required: true },
      },
    ],

    isActive: {
      type: Boolean,
      default: true,
    },
    isPublic: {
      type: Boolean,
      default: true,
    },
    sortOrder: {
      type: Number,
      default: 0,
    },

    stripeProductId: { type: String },
    stripePriceId: { type: String },
  },
  { timestamps: true }
);

export default mongoose.model<ISubscriptionPlan>('SubscriptionPlan', SubscriptionPlanSchema);
