import mongoose, { Document, Schema, Types } from "mongoose";

// Estados posibles del proceso de certificación (incluye NOT_CERTIFIED)
export type CertificationStatus =
  | "NOT_CERTIFIED"
  | "PENDING"
  | "APPROVED"
  | "REJECTED";

// Estructura básica para autores y tutores
export interface IAuthor {
  _id?: Types.ObjectId;
  name: string;
  lastname: string;
}

// Sub-esquema reutilizable para autores/tutores
// _id: false evita crear IDs internos para cada autor
const AuthorSchema = new Schema<IAuthor>(
  {
    _id: { type: Schema.Types.ObjectId, ref: "User", required: false },
    name: { type: String, required: true, trim: true },
    lastname: { type: String, required: true, trim: true },
  },
  { _id: false }
);

// Interfaz principal de la tesis
export interface IThesis extends Document {
  title: string;
  authors: IAuthor[];
  tutors?: IAuthor[];
  summary: string;
  keywords: string[];
  language: string;
  degree: string;
  field?: string;
  date?: Date;

  likes: number;
  likedBy: Types.ObjectId[];
  quotes: number;

  institution?: Types.ObjectId;
  department?: string;

  status: CertificationStatus;

  uploadedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;

  // Información del archivo y su anclaje en blockchain
  fileHash: string;
  ipfsCid: string;
  txHash?: string;
  chainId?: number;
  blockNumber?: number;
}

// Esquema de Mongoose para tesis académicas
const ThesisSchema = new Schema<IThesis>(
  {
    title: { type: String, required: true, trim: true },

    authors: {
      type: [AuthorSchema],
      required: true,
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
    date: { type: Date },

    likes: { type: Number, default: 0 },
    likedBy: [{ type: Schema.Types.ObjectId, ref: "User" }],

    quotes: { type: Number, default: 0 },

    institution: {
      type: Schema.Types.ObjectId,
      ref: "Institution",
    },

    department: { type: String, trim: true },

    status: {
      type: String,
      enum: ["NOT_CERTIFIED", "PENDING", "APPROVED", "REJECTED"],
      default: "NOT_CERTIFIED",
    },

    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },

    fileHash: { type: String, required: true },

    ipfsCid: { type: String, required: true },

    txHash: { type: String },
    chainId: { type: Number },
    blockNumber: { type: Number },
  },
  { timestamps: true }
);

export const Thesis = mongoose.model<IThesis>("Thesis", ThesisSchema);