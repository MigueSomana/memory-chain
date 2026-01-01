import mongoose, { Document, Schema } from "mongoose";

// Tipos posibles de institución
export type InstitutionType = "UNIVERSITY" | "INSTITUTE" | "OTHER";

// Interfaz TypeScript que define la estructura del documento
export interface IInstitution extends Document {
  name: string;
  description?: string;
  country: string;
  website?: string;

  // Credenciales de login de la institución
  email: string;
  password: string; // Se guarda hasheada, nunca en texto plano

  // Dominios permitidos para correos institucionales (ej: @uni.edu)
  emailDomains: string[];

  type: InstitutionType;
  departments?: string[];

  isMember: boolean; // Indica si tiene membresía activa
  canVerify: boolean; // Permite certificar/verificar tesis

  // Logo almacenado como binario en MongoDB
  logo?: {
    data: Buffer; // Datos binarios de la imagen
    contentType: string; // Tipo MIME (image/png, image/jpeg, etc.)
  };

  createdAt: Date;
  updatedAt: Date;
}

// Esquema de Mongoose para la colección Institution
const InstitutionSchema = new Schema<IInstitution>(
  {
    // Nombre oficial de la institución
    name: { type: String, required: true, trim: true },

    // Descripción opcional
    description: { type: String, trim: true },

    // País donde está registrada
    country: { type: String, required: true, trim: true },

    // Sitio web oficial
    website: { type: String, trim: true },

    // Email principal para autenticación
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    // Contraseña hasheada
    password: {
      type: String,
      required: true,
      minlength: 8,
    },

    // Lista de dominios institucionales válidos
    emailDomains: {
      type: [String],
      default: [],
    },

    // Tipo de institución
    type: {
      type: String,
      enum: ["UNIVERSITY", "INSTITUTE", "OTHER"],
      default: "UNIVERSITY",
    },

    // Departamentos o facultades
    departments: {
      type: [String],
      default: [],
    },

    // Estado de membresía en la plataforma
    isMember: {
      type: Boolean,
      default: false,
    },

    // Permiso para verificar/certificar tesis
    canVerify: {
      type: Boolean,
      default: false,
    },

    // Logo institucional guardado en binario
    logo: {
      data: Buffer,
      contentType: String,
    },
  },
  {
    // Agrega automáticamente createdAt y updatedAt
    timestamps: true,
  }
);

// Método que se ejecuta al convertir el documento a JSON
// Se usa para ocultar información sensible
InstitutionSchema.methods.toJSON = function () {
  const obj: any = this.toObject();
  delete obj.password; // Nunca exponer la contraseña
  return obj;
};

// Modelo final de Mongoose
export const Institution = mongoose.model<IInstitution>(
  "Institution",
  InstitutionSchema
);
