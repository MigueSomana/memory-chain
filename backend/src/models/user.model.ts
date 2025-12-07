import mongoose, { Schema, Document, Types } from "mongoose";
import { UserRole } from "./types";

export interface IEmailEducational {
  institution: string;
  email?: string;
}

const EmailEducationalSchema = new Schema<IEmailEducational>(
  {
    institution: { type: String, required: true },
    email: { type: String },
  },
  { _id: false }
);

export interface IUser extends Document {
  img?: {
    data: Buffer; // binario de la imagen
    contentType: string; // tipo MIME (image/png, image/jpeg, etc.)
  };
  name: string;
  lastname?: string;
  email: string;
  password: string;
  educationalEmails: IEmailEducational[];
  role: UserRole;
  isActive: boolean;
  institutions: Types.ObjectId[]; // instituciones asociadas
  likedTheses: Types.ObjectId[]; // tesis a las que dio like
  createdAt: Date;
  updatedAt: Date;
}

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
      default: UserRole.REGULAR,
    },
    isActive: { type: Boolean, default: true },
    institutions: [{ type: Schema.Types.ObjectId, ref: "Institution" }],
    likedTheses: [{ type: Schema.Types.ObjectId, ref: "Thesis" }],
  },
  { timestamps: true }
);

// quitar password al convertir a JSON
UserSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

export const User = mongoose.model<IUser>("User", UserSchema);
