import { Schema, model, Document } from 'mongoose';
import { InstitutionType } from './types';

export interface IInstitution {
  name: string;
  description?: string;
  country: string;
  website?: string;
  emailDomain?: string;
  emailDomains: string[];
  type: InstitutionType;
  departmentsName: string;
  departmentCode: string;
  isMember: boolean;
  canVerify: boolean;
  logo?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IInstitutionDocument extends IInstitution, Document {}

const institutionSchema = new Schema<IInstitutionDocument>(
  {
    name: { type: String, required: true },
    description: { type: String },
    country: { type: String, required: true },
    website: { type: String },
    emailDomain: { type: String }, // opcional, por compatibilidad
    emailDomains: { type: [String], default: [] },
    type: {
      type: String,
      enum: ['university', 'institute', 'other'],
      default: 'university',
    },
    departmentsName: { type: String, required: true },
    departmentCode: { type: String, required: true },
    isMember: { type: Boolean, default: false },
    canVerify: { type: Boolean, default: false },
    logo: { type: String },
  },
  {
    timestamps: true,
  }
);

export const Institution = model<IInstitutionDocument>('Institution', institutionSchema);
