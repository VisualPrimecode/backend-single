import mongoose, { Schema, Document } from 'mongoose';

// Enum for ticket status
export enum TicketStatus {
  Open = 'open',
  InProgress = 'in-progress',
  Closed = 'closed',
  OnHold = 'on-hold'
}

export enum TicketType {
  Billing = 'billing',
  Account = 'account',
  Technical = 'technical',
  General = 'general',
  Feedback = 'feedback',
}
// Enum for ticket priority
export enum TicketPriority {
  Low = 'low',
  Medium = 'medium',
  High = 'high',
  Urgent = 'urgent'
}

// Interface for TypeScript type checking
export interface ISupportTicket extends Document {

  businessId: mongoose.Types.ObjectId;
  customerId: mongoose.Types.ObjectId;
  subject: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  type?: TicketType; 
  assignedAgent?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  comments?: {
    role: 'user' | 'agent';
    comment: string;
    createdAt: Date;
  }[];
  resolution?: string;
}

// Mongoose schema definition
const SupportTicketSchema: Schema = new Schema<ISupportTicket>(
  {
    
    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'Customer',
      required: [true, 'Customer ID is required']
    },
    businessId: {
      type: Schema.Types.ObjectId,
      ref: 'Business',
      required: [true, 'Business ID is required']
    },
    subject: {
      type: String,
      required: [true, 'Subject is required'],
      trim: true,
      minlength: [5, 'Subject must be at least 5 characters long'],
      maxlength: [100, 'Subject cannot exceed 100 characters']
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
      minlength: [10, 'Description must be at least 10 characters long'],
      maxlength: [2000, 'Description cannot exceed 2000 characters']
    },
    status: {
      type: String,
      enum: {
        values: Object.values(TicketStatus),
        message: 'Invalid status value'
      },
      default: TicketStatus.Open
    },
    priority: {
      type: String,
      enum: {
        values: Object.values(TicketPriority),
        message: 'Invalid priority value'
      },
      default: TicketPriority.Medium
    },
    type: {
      type: String,
      enum: {
        values: Object.values(TicketType),
        message: 'Invalid ticket type'
      },
      default: TicketType.General
    },
    assignedAgent: {
      type: Schema.Types.ObjectId,
      ref: 'Agent',
      default: null
    },
    comments: [{
      role: {
        type: String,
        enum: ['user', 'agent'],
        required: true
      },
      comment: {
        type: String,
        required: true,
        trim: true,
        minlength: [1, 'Comment cannot be empty'],
        maxlength: [1000, 'Comment cannot exceed 1000 characters']
      },
      createdAt: {
        type: Date,
        default: Date.now
      }
    }],
    resolution: {
      type: String,
      trim: true,
      maxlength: [2000, 'Resolution cannot exceed 2000 characters'],
      default: null
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes for faster queries
SupportTicketSchema.index({ customerId: 1, status: 1, priority: 1 });


// Mongoose model
export const SupportTicket = mongoose.model<ISupportTicket>('SupportTicket', SupportTicketSchema);