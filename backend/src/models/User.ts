import mongoose, { Document, Schema, Types } from "mongoose";
import bcrypt from "bcryptjs";

export interface IUser extends Document {
  name: string;
  lastname: string;
  email: string;
  password: string;
  educationalEmails: string[]; // Múltiples correos educativos
  institutions: Types.ObjectId[]; // Referencias a instituciones
  role: "user" | "institution_admin" | "admin";
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
} 

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    lastname: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    educationalEmails: [{ 
      type: String, 
      lowercase: true,
      validate: {
        validator: function(email: string) {
          // Validar que sea un email educativo (.edu, .edu.co, etc.)
          return /^[^\s@]+@[^\s@]+\.(edu|edu\.[a-z]{2,3})$/i.test(email);
        },
        message: 'Must be a valid educational email'
      }
    }],
    institutions: [{ 
      type: Schema.Types.ObjectId, 
      ref: 'Institution' 
    }],
    role: {
      type: String,
      enum: ["user", "institution_admin", "admin"],
      default: "user",
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

// Index for better performance
userSchema.index({ email: 1 });
userSchema.index({ educationalEmails: 1 });

export const User = mongoose.model<IUser>("User", userSchema);