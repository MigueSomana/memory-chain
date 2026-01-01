import mongoose, { Schema, Document, Types } from "mongoose";
import { UserRole } from "./types";

// Estructura para correos educativos asociados a instituciones
export interface IEmailEducational {
  institution: string; // Nombre o identificador de la institución
  email?: string; // Correo institucional del usuario
}

// Sub-esquema para correos educativos
// _id: false evita crear IDs internos innecesarios
const EmailEducationalSchema = new Schema<IEmailEducational>(
  {
    institution: { type: String, required: true }, // Institución asociada
    email: { type: String }, // Email educativo
  },
  { _id: false }
);

// Interfaz principal del usuario
export interface IUser extends Document {
  img?: {
    data: Buffer; // Imagen de perfil en binario
    contentType: string; // Tipo MIME de la imagen
  };
  name: string;
  lastname?: string;
  email: string;
  password: string; // Contraseña hasheada
  educationalEmails: IEmailEducational[];
  role: UserRole;
  isActive: boolean;
  institutions: Types.ObjectId[]; // Instituciones vinculadas al usuario
  likedTheses: Types.ObjectId[]; // Tesis que el usuario ha marcado con like
  createdAt: Date;
  updatedAt: Date;
}

// Esquema de Mongoose para usuarios
const UserSchema = new Schema<IUser>(
  {
    // Imagen de perfil del usuario
    img: {
      data: Buffer,
      contentType: String,
    },

    // Nombre del usuario
    name: { type: String, required: true },

    // Apellido del usuario
    lastname: { type: String },

    // Email principal usado para login
    email: { type: String, required: true, unique: true, index: true },

    // Contraseña (siempre almacenada hasheada)
    password: { type: String, required: true },

    // Correos educativos asociados a distintas instituciones
    educationalEmails: { type: [EmailEducationalSchema], default: [] },

    // Rol del usuario dentro de la plataforma
    role: {
      type: String,
      enum: Object.values(UserRole),
      default: UserRole.REGULAR,
    },

    // Estado de la cuenta (activa o desactivada)
    isActive: { type: Boolean, default: true },

    // Instituciones a las que pertenece el usuario
    institutions: [{ type: Schema.Types.ObjectId, ref: "Institution" }],

    // Tesis que el usuario ha dado like
    likedTheses: [{ type: Schema.Types.ObjectId, ref: "Thesis" }],
  },
  {
    // Agrega createdAt y updatedAt automáticamente
    timestamps: true,
  }
);

// Método que se ejecuta al serializar a JSON
// Elimina datos sensibles antes de enviar al frontend
UserSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password; // Nunca exponer la contraseña
  return obj;
};

// Modelo final de la colección User
export const User = mongoose.model<IUser>("User", UserSchema);
