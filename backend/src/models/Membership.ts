import mongoose, { Document, Schema } from 'mongoose';

export interface IMembership extends Document {
  workplaceId: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  status: 'pending_approval' | 'approved';
  faceDescriptor?: number[];
  createdAt: Date;
  updatedAt: Date;
}

const MembershipSchema = new Schema<IMembership>(
  {
    workplaceId: { type: Schema.Types.ObjectId, ref: 'Workplace', required: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: {
      type: String,
      enum: ['pending_approval', 'approved'],
      default: 'pending_approval',
      required: true,
    },
    faceDescriptor: {
      type: [Number],
      default: undefined,
    },
  },
  { timestamps: true }
);

// Compound index on (workplaceId, studentId)
MembershipSchema.index({ workplaceId: 1, studentId: 1 }, { unique: true });

export const Membership = mongoose.model<IMembership>('Membership', MembershipSchema);
