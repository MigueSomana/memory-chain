import mongoose, { Schema, Document } from 'mongoose';

export interface Career {
  name: string;
  code?: string;
}

export interface InstitutionDocument extends Document {
  name: string;
  country: string;
  website?: string;
  type: 'public' | 'private' | 'hybrid';
  careers: Career[];
  isActiveMembership: boolean;
  canVerifyTheses: boolean;
  allowedEmails: string[]; // Ej: ["@universidad.edu"]
  createdAt: Date;
}

const CareerSchema = new Schema<Career>({
  name: { type: String, required: true },
  code: { type: String },
});

const InstitutionSchema = new Schema<InstitutionDocument>({
  name: { type: String, required: true, unique: true },
  country: { type: String, required: true },
  website: { type: String },
  type: { type: String, enum: ['public', 'private'], required: true },
  careers: { type: [CareerSchema], default: [] },
  isActiveMembership: { type: Boolean, default: false },
  canVerifyTheses: { type: Boolean, default: false },
  allowedEmails: { type: [String], default: [] },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model<InstitutionDocument>('Institution', InstitutionSchema);
