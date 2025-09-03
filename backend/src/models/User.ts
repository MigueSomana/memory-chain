import mongoose, { Document, Schema, Types } from 'mongoose';
import bcrypt from 'bcryptjs';

export type UserRole = 'user' | 'institution_admin' | 'admin';

export interface IUser extends Document {
  name: string;
  lastname?: string;
  email: string;
  password: string;
  educationalEmails: string[];
  institutions: Types.ObjectId[];   // refs Institution
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidate: string): Promise<boolean>;
}

const UserSchema = new Schema<IUser>({
  name: { type: String, required: true, trim: true },
  lastname: { type: String, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  password: { type: String, required: true },
  educationalEmails: { type: [String], default: [], index: true },
  institutions: [{ type: Schema.Types.ObjectId, ref: 'Institution', index: true }],
  role: { type: String, enum: ['user', 'institution_admin', 'admin'], default: 'user', index: true },
  isActive: { type: Boolean, default: true }
}, { 
  timestamps: true // Esto añade automáticamente createdAt y updatedAt
});

UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

UserSchema.methods.comparePassword = function (candidate: string) {
  return bcrypt.compare(candidate, this.password);
};

export const User = mongoose.model<IUser>('User', UserSchema);