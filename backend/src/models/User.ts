import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
    username: string;
    password: string;
    email: string;
    avatarUrl: string | null;
    currentSessionToken: string;
    faceDescriptor: number[];
    isActive: boolean; // was missing — Teacher had it, User didn't
    createdAt: Date;
    updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
    {
        username: { type: String, required: true, unique: true, trim: true },
        password: { type: String, required: true, select: false },
        email: { type: String, required: true, unique: true, lowercase: true, trim: true },
        avatarUrl: { type: String, default: null },
        // Stores the unique token of their current active device
        currentSessionToken: { type: String, default: '', select: false },
        // 128-number face descriptor array (Phase 4)
        faceDescriptor: { type: [Number], default: [] },
        isActive: { type: Boolean, default: true },
    },
    { timestamps: true } // was missing — no createdAt/updatedAt before
);

export const User = mongoose.model<IUser>('User', UserSchema);