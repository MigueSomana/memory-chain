import mongoose, { Schema, Document } from 'mongoose';

export interface Department { 
  name: string; 
  code?: string; 
  description?: string; 
}

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
  createdAt: Date;
  updatedAt: Date;
}

const DepartmentSchema = new Schema<Department>({
  name: { type: String, required: true, trim: true },
  code: { type: String, trim: true },
  description: { type: String, trim: true }
}, { _id: false }); // No generar _id para subdocumentos

const InstitutionSchema = new Schema<InstitutionDocument>({
  name: { type: String, required: true, trim: true, index: true },
  description: { type: String, trim: true },
  country: { type: String, required: true, index: true },
  website: { type: String, trim: true },
  emailDomain: { 
    type: String, 
    required: true, 
    unique: true, 
    lowercase: true, 
    trim: true, 
    index: true 
  },
  type: { 
    type: String, 
    enum: ['public', 'private', 'hybrid'], 
    required: true 
  },
  departments: { type: [DepartmentSchema], default: [] },
  isMember: { type: Boolean, default: false },
  canVerify: { type: Boolean, default: false },
  logo: { type: String, trim: true }
}, { 
  timestamps: true // Añade createdAt y updatedAt automáticamente
});

// Índices adicionales para búsquedas eficientes
InstitutionSchema.index({ 'departments.name': 1 });
InstitutionSchema.index({ name: 'text', 'departments.name': 'text' });

export default mongoose.model<InstitutionDocument>('Institution', InstitutionSchema);