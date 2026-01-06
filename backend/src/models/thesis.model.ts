import mongoose, { Document, Schema, Types } from "mongoose";

// Estados posibles del proceso de certificación
export type CertificationStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED";

// Estructura básica para autores y tutores
export interface IAuthor {
  name: string;
  lastname: string;
  email?: string;
}

// Sub-esquema reutilizable para autores/tutores
// _id: false evita crear IDs internos para cada autor
const AuthorSchema = new Schema<IAuthor>(
  {
    name: { type: String, required: true, trim: true }, // Nombre del autor
    lastname: { type: String, required: true, trim: true }, // Apellido
    email: { type: String, trim: true, lowercase: true }, // Email opcional
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
  date?: Date; // fecha completa (día/mes/año)

  likes: number;
  likedBy: Types.ObjectId[];

  institution: Types.ObjectId;
  department?: string;
  status: CertificationStatus;
  uploadedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;

  // Información del archivo y su anclaje en blockchain
  fileHash: string;
  hashAlgorithm: "sha256" | "sha3" | "keccak256";
  ipfsCid: string;
  txHash?: string;
  chainId?: number;
  blockNumber?: number;
}

// Esquema de Mongoose para tesis académicas
const ThesisSchema = new Schema<IThesis>(
  {
    // Título de la tesis
    title: { type: String, required: true, trim: true },

    // Lista de autores (al menos uno obligatorio)
    authors: {
      type: [AuthorSchema],
      validate: [(v: IAuthor[]) => v.length > 0, "At least one author."],
    },

    // Tutores o directores de tesis
    tutors: {
      type: [AuthorSchema],
      default: [],
    },

    // Resumen académico
    summary: { type: String, required: true, trim: true },

    // Palabras clave para búsquedas
    keywords: {
      type: [String],
      default: [],
    },

    // Idioma de la tesis
    language: { type: String, required: true, trim: true },

    // Grado académico (ej: Bachelor, Master, PhD)
    degree: { type: String, required: true, trim: true },

    // Área o campo de estudio
    field: { type: String, trim: true },

    // Fecha de publicación (día/mes/año)
date: { type: Date },

    // Contador de likes
    likes: { type: Number, default: 0 },

    // Usuarios que dieron like (evita duplicados a nivel lógica)
    likedBy: [{ type: Schema.Types.ObjectId, ref: "User" }],

    // Institución a la que pertenece la tesis
    institution: {
      type: Schema.Types.ObjectId,
      ref: "Institution",
      required: true,
    },

    // Departamento o facultad
    department: { type: String, trim: true },

    // Estado de certificación
    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED"],
      default: "PENDING",
    },

    // Usuario que subió la tesis
    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },

    // Hash criptográfico del archivo original
    fileHash: { type: String, required: true },

    // Algoritmo usado para generar el hash
    hashAlgorithm: {
      type: String,
      enum: ["sha256", "sha3", "keccak256"],
      required: true,
      default: "sha256",
    },

    // CID del archivo almacenado en IPFS
    ipfsCid: { type: String, required: true },

    // Hash de la transacción en blockchain
    txHash: { type: String },

    // Red blockchain usada (ej: Polygon Amoy)
    chainId: { type: Number },

    // Bloque donde quedó registrada la transacción
    blockNumber: { type: Number },
  },
  {
    // Agrega createdAt y updatedAt automáticamente
    timestamps: true,
  }
);

// Modelo final de la colección Thesis
export const Thesis = mongoose.model<IThesis>("Thesis", ThesisSchema);
