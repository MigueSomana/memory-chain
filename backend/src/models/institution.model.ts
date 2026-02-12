import mongoose, { Document, Schema } from "mongoose";

// Tipos posibles de institución
export type InstitutionType =
  | "UNIVERSITY"
  | "INSTITUTE"
  | "COLLEGE"
  | "ACADEMIC"
  | "OTHER";

// Interfaz TypeScript que define la estructura del documento
export interface IInstitution extends Document {
  name: string;
  description?: string;
  country: string;
  website?: string;

  email: string;
  password: string;

  emailDomains: string[];
  type: InstitutionType;
  departments?: string[];

  isMember: boolean;
  canVerify: boolean;

  // Wallet
  wallet?: string;

  logo?: {
    data: Buffer;
    contentType: string;
  };

  createdAt: Date;
  updatedAt: Date;
}

// Esquema de Mongoose para la colección Institution
const InstitutionSchema = new Schema<IInstitution>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    country: { type: String, required: true, trim: true },
    website: { type: String, trim: true },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
      minlength: 8,
    },

    emailDomains: {
      type: [String],
      default: [],
    },

    type: {
      type: String,
      enum: ["UNIVERSITY", "INSTITUTE", "COLLEGE", "ACADEMIC", "OTHER"],
      default: "UNIVERSITY",
    },

    departments: {
      type: [String],
      default: [],
    },

    isMember: {
      type: Boolean,
      default: false,
    },

    canVerify: {
      type: Boolean,
      default: false,
    },

    // Wallet institución
    wallet: { type: String, trim: true },

    logo: {
      data: Buffer,
      contentType: String,
    },
  },
  { timestamps: true }
);

InstitutionSchema.methods.toJSON = function () {
  const obj: any = this.toObject();
  delete obj.password;
  return obj;
};

export const Institution = mongoose.model<IInstitution>(
  "Institution",
  InstitutionSchema
);