import mongoose, { Document, Schema } from "mongoose";

export interface IEmailLog extends Document {
  businessId: mongoose.Types.ObjectId;
  customerId: mongoose.Types.ObjectId;
  to: string;
  subject: string;
  body?: string;
  filename?: string;
  messageId?: string;
  response?: string;
  status: "pending" | "sent" | "failed";
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

const EmailLogSchema = new Schema<IEmailLog>(
  {
    businessId: { type: Schema.Types.ObjectId, ref: "Business",  },
    customerId: { type: Schema.Types.ObjectId, ref: "Customer", },
    to: { type: String, required: true },
    subject: { type: String, required: true },
    body: { type: String },
    filename: { type: String },
    messageId: { type: String },
    response: { type: String },
    status: {
      type: String,
      enum: ["pending", "sent", "failed"],
      default: "pending",
      required: true,
    },
    error: { type: String },
  },
  { timestamps: true }
);

export const EmailLog = mongoose.model<IEmailLog>("EmailLog", EmailLogSchema);