import { Schema, model, Document, Types } from 'mongoose';
import { UserRole } from './types';

export interface IUser {
  name: string;
  lastname?: string;
  email: string;
  password: string;
  educationalEmails: string[];
  institutions: Types.ObjectId[];
  role: UserRole;
  isActive: boolean;
  likedTheses: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

export interface IUserDocument extends IUser, Document {}

const userSchema = new Schema<IUserDocument>(
  {
    name: { type: String, required: true },
    lastname: { type: String },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    educationalEmails: { type: [String], default: [] },
    institutions: [{ type: Schema.Types.ObjectId, ref: 'Institution' }],
    role: {
      type: String,
      enum: ['user', 'institutionAdmin', 'superAdmin'],
      default: 'user',
    },
    isActive: { type: Boolean, default: true },
    likedTheses: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Thesis',
        default: [],
      },],
  },
  {
    timestamps: true,
  }
);

export const User = model<IUserDocument>('User', userSchema);