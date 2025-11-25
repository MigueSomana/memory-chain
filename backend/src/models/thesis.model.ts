import { Schema, model, Document, Types } from 'mongoose';
import { IAuthor, CertificationStatus } from './types';

export interface IThesis {
  title: string;
  authors: IAuthor[];
  advisors?: IAuthor[];
  summary: string;
  keywords: string[];
  language: string;
  degree: string;
  field?: string;
  year?: number;
  likes: number;
  institution: Types.ObjectId;
  department?: string;
  doi?: string;
  version?: number;
  status: CertificationStatus;
  uploadedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  // Archivo + blockchain
  fileHash: string;
  hashAlgorithm: 'sha256' | 'sha3' | 'keccak256';
  ipfsCid: string;
  txHash?: string;
  chainId?: number;
  blockNumber?: number;
}

export interface IThesisDocument extends IThesis, Document {}

const authorSchema = new Schema<IAuthor>(
  {
    name: { type: String, required: true },
    lastname: { type: String },
    email: { type: String },
    institution: { type: Schema.Types.ObjectId, ref: 'Institution' },
  },
  { _id: false }
);

const thesisSchema = new Schema<IThesisDocument>(
  {
    title: { type: String, required: true },
    authors: { type: [authorSchema], required: true },
    advisors: { type: [authorSchema], default: [] },
    summary: { type: String, required: true },
    keywords: { type: [String], default: [] },
    language: { type: String, required: true },
    degree: { type: String, required: true },
    field: { type: String },
    year: { type: Number },
    likes: { type: Number, default: 0 },
    institution: { type: Schema.Types.ObjectId, ref: 'Institution', required: true },
    department: { type: String },
    doi: { type: String },
    version: { type: Number, default: 1 },
    status: {
      type: String,
      enum: ['pending', 'certified', 'rejected'],
      default: 'pending',
    },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User' },

    fileHash: { type: String, required: true },
    hashAlgorithm: {
      type: String,
      enum: ['sha256', 'sha3', 'keccak256'],
      default: 'sha256',
    },
    ipfsCid: { type: String, required: true },
    txHash: { type: String },
    chainId: { type: Number },
    blockNumber: { type: Number },
  },
  {
    timestamps: true,
  }
);

export const Thesis = model<IThesisDocument>('Thesis', thesisSchema);
