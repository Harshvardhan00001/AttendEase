import mongoose, { Document, Schema } from 'mongoose';

export interface IAttendanceLog extends Document {
  studentId: mongoose.Types.ObjectId;
  workplaceId: mongoose.Types.ObjectId;
  timestamp: Date;
  status: 'present';
  networkVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const AttendanceLogSchema = new Schema<IAttendanceLog>(
  {
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    workplaceId: { type: Schema.Types.ObjectId, ref: 'Workplace', required: true },
    timestamp: { type: Date, default: Date.now, required: true },
    status: { type: String, enum: ['present'], default: 'present', required: true },
    networkVerified: { type: Boolean, required: true },
  },
  { timestamps: true }
);

export const AttendanceLog = mongoose.model<IAttendanceLog>('AttendanceLog', AttendanceLogSchema);
