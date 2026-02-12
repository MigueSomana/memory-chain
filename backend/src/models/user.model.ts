import mongoose, { Schema, Document, Types } from "mongoose";
import { UserRole } from "./types";

export type AccountStatus = "PENDING" | "APPROVED" | "REJECTED";

// Estructura para correos educativos asociados a instituciones
export interface IEmailEducational {
  institution: string; // Nombre o identificador de la institución
  email?: string; // Correo institucional del usuario
  status: AccountStatus;
}

// Sub-esquema para correos educativos
const EmailEducationalSchema = new Schema<IEmailEducational>(
  {
    institution: { type: String, required: true },
    email: { type: String },
    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED"],
      default: "PENDING",
      required: true,
    },
  },
  { _id: false }
);

// Interfaz principal del usuario
export interface IUser extends Document {
  img?: {
    data: Buffer;
    contentType: string;
  };
  name: string;
  lastname?: string;
  email: string;
  password: string;

  educationalEmails: IEmailEducational[];

  role: UserRole;

  // ✅ wallet
  wallet?: string;

  institutions: Types.ObjectId[];
  likedTheses: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

// Esquema de Mongoose para usuarios
const UserSchema = new Schema<IUser>(
  {
    img: {
      data: Buffer,
      contentType: String,
    },

    name: { type: String, required: true },
    lastname: { type: String },

    email: { type: String, required: true, unique: true, index: true },
    password: { type: String, required: true },

    educationalEmails: { type: [EmailEducationalSchema], default: [] },

    role: {
      type: String,
      enum: Object.values(UserRole),
      default: UserRole.STUDENT,
    },

    // Wallet del usuario
    wallet: { type: String, trim: true },

    institutions: [{ type: Schema.Types.ObjectId, ref: "Institution" }],
    likedTheses: [{ type: Schema.Types.ObjectId, ref: "Thesis" }],
  },
  { timestamps: true }
);

UserSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

export const User = mongoose.model<IUser>("User", UserSchema);