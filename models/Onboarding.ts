import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IOnboarding extends Document {
  _id: mongoose.Types.ObjectId;
  employeeId: mongoose.Types.ObjectId;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'ON_HOLD';
  createdBy: mongoose.Types.ObjectId;
  assignedSupervisorId: mongoose.Types.ObjectId;
  completedAt?: Date;
  notes?: string;
  statusHistory: Array<{
    status: string;
    changedBy: mongoose.Types.ObjectId;
    changedAt: Date;
    reason?: string;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const OnboardingSchema = new Schema<IOnboarding>(
  {
    employeeId: {
      type: Schema.Types.ObjectId,
      ref: 'Employee',
      required: [true, 'Employee ID is required'],
      unique: true,
    },
    status: {
      type: String,
      enum: ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'ON_HOLD'],
      default: 'NOT_STARTED',
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Created by is required'],
    },
    assignedSupervisorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Assigned supervisor is required'],
    },
    completedAt: {
      type: Date,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [1000, 'Notes cannot exceed 1000 characters'],
    },
    statusHistory: [
      {
        status: { type: String, required: true },
        changedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        changedAt: { type: Date, default: Date.now },
        reason: { type: String, trim: true },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Indexes
OnboardingSchema.index({ employeeId: 1 }, { unique: true });
OnboardingSchema.index({ assignedSupervisorId: 1 });
OnboardingSchema.index({ status: 1 });
OnboardingSchema.index({ createdBy: 1 });

const Onboarding: Model<IOnboarding> =
  mongoose.models.Onboarding || mongoose.model<IOnboarding>('Onboarding', OnboardingSchema);

export default Onboarding;
