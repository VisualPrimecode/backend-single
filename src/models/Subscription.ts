import mongoose, { Schema, Document, Types } from 'mongoose';

export type SubscriptionPlan = 'free' | 'pro' | 'enterprise';
export type SubscriptionStatus =
  | 'trialing'
  | 'active'
  | 'cancelled'
  | 'expired'
  | 'past_due'
  | 'unpaid';

export interface ISubscription extends Document {
  businessId: Types.ObjectId;
  userId: Types.ObjectId;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  startDate: Date;
  endDate: Date;
  trialEndsAt?: Date;
  canceledAt?: Date;
  autoRenew: boolean;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SubscriptionSchema = new Schema<ISubscription>(
  {
    businessId: {
      type: Schema.Types.ObjectId,
      ref: 'Business',
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    plan: {
      type: String,
      enum: ['free', 'pro', 'enterprise'],
      required: true,
    },
    status: {
      type: String,
      enum: ['trialing', 'active', 'cancelled', 'expired', 'past_due', 'unpaid'],
      default: 'trialing',
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },

    trialEndsAt: { type: Date },            // ⏱ Trial expiration timestamp
    canceledAt: { type: Date },             // 📅 Cancellation date

    autoRenew: { type: Boolean, default: true },  // 🔁 Set to false when manually cancelled

    stripeCustomerId: { type: String },     // 🔐 Optional Stripe fields
    stripeSubscriptionId: { type: String },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<ISubscription>('Subscription', SubscriptionSchema);
