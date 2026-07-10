import mongoose, { Document, Schema } from 'mongoose';

export interface ITeacher extends Document {
    name: string;
    email: string;
    password: string;
    department: string;
    // Classes/sections this teacher manages
    assignedClasses: mongoose.Types.ObjectId[];
    // Session token for single-device login (mirrors User model pattern)
    currentSessionToken: string;
    // Face descriptor for biometric attendance (Phase 4 compatibility)
    faceDescriptor: number[];
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const TeacherSchema = new Schema<ITeacher>(
    {
        name: { type: String, required: true, trim: true },
        email: { type: String, required: true, unique: true, lowercase: true, trim: true },
        password: { type: String, required: true },
        department: { type: String, required: true, trim: true },
        // References to Class/Section documents (to be defined in a future model)
        assignedClasses: [{ type: Schema.Types.ObjectId, ref: 'Class' }],
        // Stores the unique token of the teacher's current active device session
        currentSessionToken: { type: String, default: '' },
        // Stores the 128-number face descriptor array for biometric auth (Phase 4)
        faceDescriptor: { type: [Number], default: [] },
        isActive: { type: Boolean, default: true },
    },
    {
        timestamps: true, // Automatically manages createdAt and updatedAt
    }
);

export const Teacher = mongoose.model<ITeacher>('Teacher', TeacherSchema);
