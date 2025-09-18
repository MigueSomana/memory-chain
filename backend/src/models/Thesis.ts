import mongoose, { Document, Model, Schema, Types } from 'mongoose';

export interface IAuthor {
  name: string;
  email?: string;        // Puede no existir en todos los casos públicos
  orcid?: string;        // Opcional (estándar académico)
}

export type CertificationStatus =
  | 'draft'
  | 'published'
  | 'institution_verified'
  | 'certified';

export interface IThesis extends Document {
  title: string;
  authors: IAuthor[];       // ≥1
  advisors?: IAuthor[];     // Opcional
  summary: string;
  keywords: string[];
  language: string;         // 'es' | 'en' | ...
  degree: string;           // Licenciatura/Máster/Doctorado/...
  field?: string;           // Área/Disciplina
  year?: number;
  institution: Types.ObjectId; // ref Institution
  department?: string;

  // Trazabilidad / Web3
  fileHash: string;         // ej: sha256 del PDF
  hashAlgorithm: 'sha256' | 'sha3' | 'keccak256';
  ipfsCid: string;          // CID v0/v1
  txHash?: string;
  chainId?: number;
  blockNumber?: number;

  // Metadatos adicionales
  doi?: string;
  version?: number;

  status: CertificationStatus;

  uploadedBy?: Types.ObjectId; // ref User
  createdAt: Date;
  updatedAt: Date;
}

type IThesisModel = Model<IThesis>;

const CID_V0 = /^Qm[1-9A-HJ-NP-Za-km-z]{44}$/; // base58btc (simplificado)
const CID_V1 = /^bafy[1-9A-HJ-NP-Za-km-z]+$/;   // base32 (simplificado)
const HASH_HEX = /^[a-f0-9]{64}$/i;

const AuthorSchema = new Schema<IAuthor>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, trim: true },
    orcid: { type: String, trim: true },
  },
  { _id: false }
);

const ThesisSchema = new Schema<IThesis, IThesisModel>(
  {
    title: { type: String, required: true, trim: true, index: true },
    authors: {
      type: [AuthorSchema],
      validate: [(arr: IAuthor[]) => Array.isArray(arr) && arr.length > 0, 'Se requiere al menos un autor.'],
      required: true,
    },
    advisors: { type: [AuthorSchema], default: [] },
    summary: { type: String, required: true, trim: true },
    keywords: {
      type: [String],
      default: [],
      set: (arr: string[]) => Array.from(new Set((arr || []).map((s) => s.trim()))),
      index: true,
    },
    language: { type: String, required: true, trim: true, index: true },
    degree: { type: String, required: true, trim: true, index: true },
    field: { type: String, trim: true },
    year: {
      type: Number,
      min: 1900,
      max: 2100,
      index: true,
    },
    institution: { type: Schema.Types.ObjectId, ref: 'Institution', required: true, index: true },
    department: { type: String, trim: true },

    fileHash: {
      type: String,
      required: true,
      validate: {
        validator: (v: string) => HASH_HEX.test(v),
        message: 'fileHash debe ser un HEX de 64 caracteres (sha256).',
      },
      index: true,
    },
    hashAlgorithm: {
      type: String,
      enum: ['sha256', 'sha3', 'keccak256'],
      default: 'sha256',
    },
    ipfsCid: {
      type: String,
      required: true,
      validate: {
        validator: (v: string) => CID_V0.test(v) || CID_V1.test(v),
        message: 'ipfsCid no parece un CID válido (v0 o v1).',
      },
      unique: true,
      index: true,
    },
    txHash: { type: String, trim: true, index: true },
    chainId: { type: Number },
    blockNumber: { type: Number },

    doi: { type: String, trim: true },
    version: { type: Number, default: 1, min: 1 },

    status: {
      type: String,
      enum: ['draft', 'published', 'institution_verified', 'certified'],
      default: 'published',
      index: true,
    },

    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', index: true },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Índices útiles
ThesisSchema.index({ title: 'text', summary: 'text', keywords: 'text' });

// Si quieres bloquear duplicados exactos por archivo dentro de una institución, descomenta:
ThesisSchema.index({ fileHash: 1, institution: 1 }, { unique: true });

const Thesis =
  (mongoose.models.Thesis as IThesisModel) ||
  mongoose.model<IThesis, IThesisModel>('Thesis', ThesisSchema);

export { Thesis };
export default Thesis;
