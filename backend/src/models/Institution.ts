import mongoose, { Schema, Document } from 'mongoose';

export interface Department { name: string; code?: string; description?: string; }

export interface InstitutionDocument extends Document {
  name: string;
  description?: string;
  country: string;
  website?: string;
  emailDomain: string;          // ej: "univ.edu"
  type: 'public' | 'private' | 'hybrid';
  departments: Department[];
  isMember: boolean;            // membresía activa
  canVerify: boolean;           // puede verificar tesis
  logo?: string;
}

const DepartmentSchema = new Schema<Department>({
  name: { type: String, required: true, trim: true },
  code: { type: String },
  description: { type: String }
});

const InstitutionSchema = new Schema<InstitutionDocument>({
  name: { type: String, required: true, trim: true, index: true },
  description: String,
  country: { type: String, required: true, index: true },
  website: String,
  emailDomain: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  type: { type: String, enum: ['public', 'private', 'hybrid'], required: true },
  departments: { type: [DepartmentSchema], default: [] },
  isMember: { type: Boolean, default: false },
  canVerify: { type: Boolean, default: false },
  logo: String
}, { timestamps: true });

InstitutionSchema.index({ 'departments.name': 1 });

export default mongoose.model<InstitutionDocument>('Institution', InstitutionSchema);
