import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
    email: string;
    password: string;
    role: 'admin' | 'business'
    name: string;
    businessId?: mongoose.Types.ObjectId; 
    verified: boolean;
    onboardingCompleted?: boolean;
    createdAt: Date;
    updatedAt: Date;
  }
  
  const UserSchema = new Schema<IUser>(
    {
      email: { type: String, required: true, unique: true },
      password: { type: String, required: true },
      role: { type: String, enum: ['admin', 'business'], default: 'business' },
      name: { type: String, required: true },
      businessId: { type: mongoose.Schema.Types.ObjectId, ref: 'Business' },
      onboardingCompleted: { type: Boolean, default: false },
      verified: { type: Boolean, default: false },
    },
    { timestamps: true }
  );

  UserSchema.index({ name: 'text', email: 'text' });

  
  export default mongoose.model<IUser>('User', UserSchema);
  