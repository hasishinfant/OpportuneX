import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  skills: string[];
  location: {
    city: string;
    state: string;
    country: string;
  };
  resume_path?: string;
  resume_text?: string;
  created_at: Date;
  updated_at: Date;
}

const UserSchema = new Schema<IUser>({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  skills: [{ type: String }],
  location: {
    city: { type: String },
    state: { type: String },
    country: { type: String, default: 'India' }
  },
  resume_path: { type: String },
  resume_text: { type: String },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema);