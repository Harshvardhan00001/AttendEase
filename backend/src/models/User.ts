import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    email:{type:String ,required:true,unique:true },
    // This stores the unique token of their current active device
    currentSessionToken: { type: String, default: '' },
    // This will store the 128-number face array during Phase 4
    faceDescriptor: { type: [Number], default: [] }
});

export const User = mongoose.model('User', UserSchema);