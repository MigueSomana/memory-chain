import mongoose, { Document, Schema } from "mongoose";

export type InstitutionType = "UNIVERSITY" | "INSTITUTE" | "OTHER";

export interface IInstitution extends Document {
  name: string;
  description?: string;
  country: string;
  website?: string;

  // Login principal de la institución
  email: string;
  password: string; // HASH, no texto plano

  // Dominios institucionales para correos estudiantiles
  emailDomains: string[];

  type: InstitutionType;
  departments?: string[];

  isMember: boolean; // membresía activa
  canVerify: boolean; // puede certificar tesis

  logo?: {
    data: Buffer; // binario de la imagen
    contentType: string; // tipo MIME (image/png, image/jpeg, etc.)
  };

  createdAt: Date;
  updatedAt: Date;
}

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
      required: true, // recuerda guardarla siempre hasheada
      minlength: 8,
    },

    emailDomains: {
      type: [String],
      default: [],
    },

    type: {
      type: String,
      enum: ["UNIVERSITY", "INSTITUTE", "OTHER"],
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

    logo: {
      data: Buffer,
      contentType: String,
    },
  },
  {
    timestamps: true,
  }
);

// Por seguridad, NUNCA devuelvas password en JSON
InstitutionSchema.methods.toJSON = function () {
  const obj: any = this.toObject();
  delete obj.password;
  return obj;
};

export const Institution = mongoose.model<IInstitution>("Institution",InstitutionSchema);
