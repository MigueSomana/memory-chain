import { Schema, model, Document, Types } from 'mongoose';

export interface IAuthor {
  name: string;
  email: string;
}

export type CertificationStatus = 'draft' | 'published' | 'institution_verified' | 'certified';

export interface IThesis extends Document {
  title: string;
  authors: IAuthor[];            // ≥1
  summary: string;
  keywords: string[];
  language: string;              // es|en|...
  degree: string;                // Licenciatura/Máster/Doctorado...
  workType: string;              // Tesis/Trabajo de grado/Artículo...
  department?: string;           // alias de carrera/área
  institution: Types.ObjectId;   // ref Institution
  uploadedBy: Types.ObjectId;    // ref User
  publicationDate?: Date;

  // Archivo
  file: {
    filename: string;
    size: number;
    mimetype: string;
    hash: string;                // hash local del PDF (sha256)
    ipfsCid?: string;            // CID en IPFS
  };

  // Blockchain
  chain: 'polygon';
  blockchainHash?: string;       // hash que anclas
  txId?: string;                 // tx hash (si no es mock)
  blockNumber?: number;

  // Estado
  status: CertificationStatus;

  createdAt: Date;
  updatedAt: Date;
}

const AuthorSchema = new Schema<IAuthor>({
  name: { type: String, required: true, trim: true, maxlength: 200 },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    validate: {
      validator: (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
      message: 'Must be a valid email'
    }
  }
});

const ThesisSchema = new Schema<IThesis>({
  title: { type: String, required: true, trim: true, maxlength: 500 },
  authors: { type: [AuthorSchema], required: true, validate: (arr: IAuthor[]) => arr.length >= 1 },
  summary: { type: String, required: true, maxlength: 5000 },
  keywords: { type: [String], default: [], index: true },
  language: { type: String, required: true, index: true },
  degree: { type: String, required: true, index: true },
  workType: { type: String, required: true, index: true },
  department: { type: String, index: true },
  institution: { type: Schema.Types.ObjectId, ref: 'Institution', required: true, index: true },
  uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  publicationDate: { type: Date },

  file: {
    filename: { type: String, required: true },
    size: { type: Number, required: true },
    mimetype: { type: String, required: true },
    hash: { type: String, required: true, index: true },
    ipfsCid: { type: String, index: true }
  },

  chain: { type: String, enum: ['polygon'], default: 'polygon' },
  blockchainHash: { type: String, index: true },
  txId: { type: String, index: true },
  blockNumber: { type: Number },

  status: {
    type: String,
    enum: ['draft', 'published', 'institution_verified', 'certified'],
    default: 'published',
    index: true
  }
}, { timestamps: true });

// Búsqueda básica
ThesisSchema.index({ title: 'text', summary: 'text', keywords: 'text' });

export const Thesis = model<IThesis>('Thesis', ThesisSchema);
