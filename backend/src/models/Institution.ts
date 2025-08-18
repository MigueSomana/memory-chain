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
  emailDomain: string; // Dominio del email institucional (ej: "universidad.edu")
  type: 'public' | 'private' | 'hybrid';
  departments: Department[]; // Cambié de "careers" a "departments"
  isMember: boolean; // Cambié de "isActiveMembership"
  canVerify: boolean; // Cambié de "canVerifyTheses"
  logo?: string;
  createdAt: Date;
  updatedAt: Date;
}

const DepartmentSchema = new Schema<Department>({
  name: { type: String, required: true },
  code: { type: String },
  description: { type: String },
});

const InstitutionSchema = new Schema<InstitutionDocument>({
  name: { 
    type: String, 
    required: true, 
    unique: true,
    trim: true 
  },
  description: { type: String },
  country: { type: String, required: true },
  website: { 
    type: String,
    validate: {
      validator: function(v: string) {
        return !v || /^https?:\/\/.+\..+/.test(v);
      },
      message: 'Must be a valid URL'
    }
  },
  emailDomain: { 
    type: String, 
    required: true,
    validate: {
      validator: function(v: string) {
        return /^@[^\s@]+\.(edu|edu\.[a-z]{2,3})$/i.test(v);
      },
      message: 'Must be a valid educational domain (e.g., @university.edu)'
    }
  },
  type: { 
    type: String, 
    enum: ['public', 'private', 'hybrid'], 
    required: true 
  },
  departments: { type: [DepartmentSchema], default: [] },
  isMember: { type: Boolean, default: false },
  canVerify: { type: Boolean, default: false },
  logo: { type: String }, // URL del logo
}, { timestamps: true });

// Indexes
InstitutionSchema.index({ name: 1 });
InstitutionSchema.index({ emailDomain: 1 });
InstitutionSchema.index({ 'departments.name': 1 });

export default mongoose.model<InstitutionDocument>('Institution', InstitutionSchema);