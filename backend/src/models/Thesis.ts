import { Schema, model, Document, Types } from 'mongoose';

export interface IAuthor {
  name: string;
  email: string;
}

export interface IThesis extends Document {
  title: string;
  authors: IAuthor[]; // Mínimo uno
  summary: string;
  keywords: string[];
  language: string;
  publicationDate: Date;
  uploadDate: Date;
  
  // File & Blockchain data
  file: string; // Path o URL del archivo
  ipfsHash: string;
  blockchainHash: string;
  
  // Institution data
  institution: Types.ObjectId;
  career: string; // Carrera específica
  degree: 'bachelor' | 'master' | 'phd' | 'other';
  type: 'thesis' | 'dissertation' | 'project' | 'other';
  
  // Verification
  isVerifiedByInstitution: boolean;
  verifiedAt?: Date;
  verifiedBy?: Types.ObjectId; // Usuario que verificó
  
  // Uploader
  uploadedBy: Types.ObjectId; // Usuario que subió
  
  createdAt: Date;
  updatedAt: Date;
}

const AuthorSchema = new Schema<IAuthor>({
  name: { 
    type: String, 
    required: true,
    trim: true 
  },
  email: { 
    type: String, 
    required: true,
    lowercase: true,
    validate: {
      validator: function(v: string) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      },
      message: 'Must be a valid email'
    }
  },
});

const thesisSchema = new Schema<IThesis>({
  title: { 
    type: String, 
    required: true,
    trim: true,
    maxlength: 500 
  },
  authors: {
    type: [AuthorSchema],
    required: true,
    validate: {
      validator: function(authors: IAuthor[]) {
        return authors && authors.length >= 1;
      },
      message: 'At least one author is required'
    }
  },
  summary: { 
    type: String, 
    required: true,
    maxlength: 2000 
  },
  keywords: [{ 
    type: String,
    trim: true 
  }],
  language: { 
    type: String, 
    required: true,
    enum: ['spanish', 'english', 'portuguese', 'french', 'other']
  },
  publicationDate: { 
    type: Date, 
    required: true 
  },
  uploadDate: { 
    type: Date, 
    default: Date.now 
  },
  
  // Files & Blockchain
  file: { type: String, required: true },
  ipfsHash: { type: String, required: true },
  blockchainHash: { type: String, required: true },
  
  // Institution
  institution: { 
    type: Schema.Types.ObjectId, 
    ref: 'Institution', 
    required: true 
  },
  career: { 
    type: String, 
    required: true 
  },
  degree: {
    type: String,
    enum: ['bachelor', 'master', 'phd', 'other'],
    required: true
  },
  type: {
    type: String,
    enum: ['thesis', 'dissertation', 'project', 'other'],
    default: 'thesis'
  },
  
  // Verification
  isVerifiedByInstitution: { 
    type: Boolean, 
    default: false 
  },
  verifiedAt: { type: Date },
  verifiedBy: { 
    type: Schema.Types.ObjectId, 
    ref: 'User' 
  }, 
  
  // Uploader
  uploadedBy: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
}, { timestamps: true });

// Indexes para búsquedas eficientes
thesisSchema.index({ title: 'text', summary: 'text', keywords: 'text' });
thesisSchema.index({ 'authors.name': 1 });
thesisSchema.index({ 'authors.email': 1 });
thesisSchema.index({ institution: 1 });
thesisSchema.index({ language: 1 });
thesisSchema.index({ degree: 1 });
thesisSchema.index({ uploadDate: -1 });
thesisSchema.index({ isVerifiedByInstitution: 1 });

export const Thesis = model<IThesis>('Thesis', thesisSchema);