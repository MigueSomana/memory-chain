import mongoose, { Document, Schema, Types } from "mongoose";

export type CertificationStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED";

export interface IAuthor {
  name: string;
  lastname: string;
  email?: string;
}

const AuthorSchema = new Schema<IAuthor>(
  {
    name: { type: String, required: true, trim: true },
    lastname: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
  },
  { _id: false }
);

export interface IThesis extends Document {
  title: string;
  authors: IAuthor[];
  tutors?: IAuthor[];
  summary: string;
  keywords: string[];
  language: string;
  degree: string;
  field?: string;
  year?: number;

  likes: number;
  likedBy: Types.ObjectId[];

  institution: Types.ObjectId;
  department?: string;
  doi?: string;
  status: CertificationStatus;
  uploadedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;

  // Archivo + blockchain
  fileHash: string;
  hashAlgorithm: "sha256" | "sha3" | "keccak256";
  ipfsCid: string;
  txHash?: string;
  chainId?: number;
  blockNumber?: number;
}

const ThesisSchema = new Schema<IThesis>(
  {
    title: { type: String, required: true, trim: true },
    authors: {
      type: [AuthorSchema],
      validate: [(v: IAuthor[]) => v.length > 0, "At least one author."],
    },
    tutors: {
      type: [AuthorSchema],
      default: [],
    },
    summary: { type: String, required: true, trim: true },
    keywords: {
      type: [String],
      default: [],
    },
    language: { type: String, required: true, trim: true },
    degree: { type: String, required: true, trim: true },
    field: { type: String, trim: true },
    year: { type: Number },

    likes: { type: Number, default: 0 },
    likedBy: [{ type: Schema.Types.ObjectId, ref: "User" }],

    institution: {
      type: Schema.Types.ObjectId,
      ref: "Institution",
      required: true,
    },
    department: { type: String, trim: true },
    doi: { type: String, trim: true },

    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED"],
      default: "PENDING",
    },

    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },

    fileHash: { type: String, required: true },
    hashAlgorithm: {
      type: String,
      enum: ["sha256", "sha3", "keccak256"],
      required: true,
      default: "sha256",
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

export const Thesis = mongoose.model<IThesis>("Thesis", ThesisSchema);
