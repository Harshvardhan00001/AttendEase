import mongoose, { Document, Schema } from 'mongoose';

export interface ITeacher extends Document {
    name: string;
    email: string;
    password: string;
    department: string;
    assignedClasses: mongoose.Types.ObjectId[];
    currentSessionToken: string;
    faceDescriptor: number[];
    avatarUrl: string | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const TeacherSchema = new Schema<ITeacher>(
    {
        name: { type: String, required: true, trim: true },
        email: { type: String, required: true, unique: true, lowercase: true, trim: true },
        password: { type: String, required: true, select: false },
        department: { type: String, required: true, trim: true },
        assignedClasses: [{ type: Schema.Types.ObjectId, ref: 'Class' }],
        currentSessionToken: { type: String, default: '', select: false },
        faceDescriptor: { type: [Number], default: [] },
        avatarUrl: { type: String, default: null },
        isActive: { type: Boolean, default: true },
    },
    { timestamps: true }
);

// Register placeholder Class model if not already registered to prevent MissingSchemaError on ref
if (!mongoose.models.Class) {
    mongoose.model('Class', new Schema({}, { strict: false }));
}

export const Teacher = mongoose.model<ITeacher>('Teacher', TeacherSchema);