import mongoose, { Document, Schema } from 'mongoose';

export interface IWorkplace extends Document {
  name: string;
  subjectDetails: string;
  createdBy: mongoose.Types.ObjectId;
  pinnedIP: string;          // manual/fallback override, kept for backward compatibility
  currentSessionIP: string | null;  // teacher's live IP, captured fresh each time attendance opens
  sessionStartedAt: Date | null;    // when the current session started, useful for auto-expiry
  isLive: boolean;
  joinCode: string;
  createdAt: Date;
  updatedAt: Date;
}

const WorkplaceSchema = new Schema<IWorkplace>(
  {
    name: { type: String, required: true, trim: true },
    subjectDetails: { type: String, required: true, trim: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    pinnedIP: { type: String, required: true, trim: true },
    currentSessionIP: { type: String, default: null, trim: true },
    sessionStartedAt: { type: Date, default: null },
    isLive: { type: Boolean, default: false },
    joinCode: { type: String, required: true, unique: true, index: true, trim: true },
  },
  { timestamps: true }
);

export const Workplace = mongoose.model<IWorkplace>('Workplace', WorkplaceSchema);