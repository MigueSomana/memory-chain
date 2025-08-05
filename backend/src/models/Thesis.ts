import { Schema, model, Document, Types } from 'mongoose';

export interface IAuthor {
  name: string;
  email: string;
}

export interface IThesis extends Document {
  title: string;
  authors: IAuthor[];
  summary: string;
  keywords: string[];
  language: string;
  fileUrl: string;
  hash: string;
  ipfsHash: string;
  institution: Types.ObjectId;
  faculty: string;
  degree: string;
  workType: string;
  verified: boolean;
  uploadedAt: Date;
  certifiedAt?: Date;
}

const thesisSchema = new Schema<IThesis>({
  title: { type: String, required: true },
  authors: [
    {
      name: { type: String, required: true },
      email: { type: String, required: true },
    },
  ],
  summary: { type: String, required: true },
  keywords: [{ type: String }],
  language: { type: String, required: true },
  fileUrl: { type: String, required: true },
  hash: { type: String, required: true },
  ipfsHash: { type: String, required: true },
  institution: { type: Schema.Types.ObjectId, ref: 'Institution', required: true },
  faculty: { type: String },
  degree: { type: String },
  workType: { type: String },
  verified: { type: Boolean, default: false },
  uploadedAt: { type: Date, default: Date.now },
  certifiedAt: { type: Date },
});

export const Thesis = model<IThesis>('Thesis', thesisSchema);
