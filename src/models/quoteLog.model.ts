// src/models/quoteLog.model.ts
import mongoose, { Schema, Document, Model } from 'mongoose';

// Interface for the document structure
export interface IQuoteLog extends Document {
  customerId: mongoose.Types.ObjectId | string; // Or string if you're not populating/referencing
  customerName: string;
  businessId: mongoose.Types.ObjectId | string; // Or string
  productName: string;
  quantity: number;
  totalAmount: number;
  currency?: string; // e.g., "USD"
  pdfLocalPath?: string; // Path before upload, might be useful for debugging
  pdfCloudinaryUrl?: string;
  status: 'generated_local'| 'failed_email_bad_url' | 'uploaded_cloud' | 'emailed' | 'failed_parsing' | 'failed_generation' | 'failed_upload' | 'failed_email';
  errorMessage?: string;
  operationId: string; // To trace the specific operation that generated this log
  emailSentTo?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// Mongoose Schema
const QuoteLogSchema: Schema<IQuoteLog> = new Schema(
  {
    customerId: {
      type: Schema.Types.ObjectId, // Or String if you don't use ObjectId refs
      ref: 'Customer', // Assuming you have a Customer model
      required: true,
      index: true,
    },
    customerName: {
      type: String,
      required: true,
    },
    businessId: {
      type: Schema.Types.ObjectId, // Or String
      ref: 'Business', // Assuming you have a Business model
      required: true,
      index: true,
    },
    productName: {
      type: String,
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
    },
    totalAmount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: 'USD',
    },
    pdfLocalPath: {
      type: String,
    },
    pdfCloudinaryUrl: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['generated_local', 'uploaded_cloud', 'emailed', 'failed_parsing', 'failed_generation', 'failed_upload', 'failed_email'],
      required: true,
    },
    errorMessage: {
      type: String,
    },
    operationId: {
      type: String,
      required: true,
      index: true,
    },
    emailSentTo: {
      type: String,
      trim: true,
    }
  },
  {
    timestamps: true, // Adds createdAt and updatedAt automatically
  }
);

// Create the model
// Check if the model already exists to prevent OverwriteModelError in Next.js/HMR environments
const QuoteLog: Model<IQuoteLog> = mongoose.models.QuoteLog || mongoose.model<IQuoteLog>('QuoteLog', QuoteLogSchema);

export default QuoteLog;