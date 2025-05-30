import mongoose from 'mongoose';
import dotenv from 'dotenv';
import SubscriptionPlan from '../src/models/SubscriptionPlan';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || '';

async function seedSubscriptionPlans() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    // Optional: Clear existing plans
    await SubscriptionPlan.deleteMany({});
    console.log('Existing plans cleared');

    const plans = [
      {
        name: 'free',
        label: 'Free',
        price: 0,
        currency: 'usd',
        interval: 'month',
        trialDays: 7,
        features: [
          { label: '1 User', key: 'maxUsers', value: 1 },
          { label: '1 Agent', key: 'maxAgents', value: 1 },
          { label: '1 Model', key: 'maxModels', value: 1 },
          { label: '500 Conversations', key: 'maxConversations', value: 500 },
          { label: '1 Website Connection', key: 'maxWebsites', value: 1 },
          { label: 'WhatsApp Ticketing', key: 'whatsappSupport', value: false },
          { label: 'Community Support', key: 'support', value: 'basic' },
        ],
        isActive: true,
        isPublic: true,
        sortOrder: 0,
      },
      {
        name: 'pro',
        label: 'Pro',
        price: 4900,
        currency: 'usd',
        interval: 'month',
        trialDays: 7,
        features: [
          { label: 'Up to 5 Users', key: 'maxUsers', value: 5 },
          { label: '3 Agents', key: 'maxAgents', value: 3 },
          { label: '3 Models', key: 'maxModels', value: 3 },
          { label: '5,000 Conversations', key: 'maxConversations', value: 5000 },
          { label: '1 Website Connection', key: 'maxWebsites', value: 1 },
          { label: 'WhatsApp Ticketing', key: 'whatsappSupport', value: true },
          { label: 'Priority Support', key: 'support', value: 'priority' },
          { label: 'Custom Chatbot', key: 'customBot', value: true },
        ],
        isActive: true,
        isPublic: true,
        sortOrder: 1,
      },
      {
        name: 'enterprise',
        label: 'Enterprise',
        price: 19900,
        currency: 'usd',
        interval: 'month',
        trialDays: 7,
        features: [
          { label: 'Unlimited Users', key: 'maxUsers', value: 'unlimited' },
          { label: 'Unlimited Agents', key: 'maxAgents', value: 'unlimited' },
          { label: 'Unlimited Models', key: 'maxModels', value: 'unlimited' },
          { label: 'Unlimited Conversations', key: 'maxConversations', value: 'unlimited' },
          { label: '1 Website Connection', key: 'maxWebsites', value: 1 },
          { label: 'WhatsApp Ticketing', key: 'whatsappSupport', value: true },
          { label: 'Dedicated Manager', key: 'support', value: 'dedicated' },
          { label: 'White-label Bot', key: 'whiteLabel', value: true },
        ],
        isActive: true,
        isPublic: true,
        sortOrder: 2,
      },
    ];

    await SubscriptionPlan.insertMany(plans);
    console.log('Default subscription plans seeded successfully');
  } catch (error) {
    console.error('Error seeding subscription plans:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

seedSubscriptionPlans();
