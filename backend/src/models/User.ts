import mongoose, { Document, Model, Schema, Types } from 'mongoose';
import bcrypt from 'bcryptjs';

export type UserRole = 'user' | 'institution_admin' | 'admin';

export interface IUser extends Document {
  name: string;
  lastname?: string;
  email: string;
  password: string;
  educationalEmails: string[];
  institutions: Types.ObjectId[]; // refs Institution
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;

  comparePassword(candidate: string): Promise<boolean>;
}

type IUserModel = Model<IUser>;

const EMAIL_REGEX =
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const UserSchema = new Schema<IUser, IUserModel>(
  {
    name: { type: String, required: true, trim: true },
    lastname: { type: String, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: EMAIL_REGEX,
      index: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 8,
      select: false, // ¡No devolver por defecto!
    },
    educationalEmails: {
      type: [String],
      default: [],
      validate: {
        validator: function (arr: string[]) {
          return arr.every((e) => EMAIL_REGEX.test(e));
        },
        message: 'Alguno de los educationalEmails no es un correo válido.',
      },
    },
    institutions: [{ type: Schema.Types.ObjectId, ref: 'Institution', index: true }],
    role: {
      type: String,
      enum: ['user', 'institution_admin', 'admin'],
      default: 'user',
      index: true,
    },
    isActive: { type: Boolean, default: true, index: true },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: {
      virtuals: true,
      transform(_doc, ret: { password?: string }) {
        delete ret.password;
        return ret;
      },
    },
    toObject: { virtuals: true },
  }
);

// Virtual handy (opcional)
UserSchema.virtual('fullName').get(function (this: IUser) {
  return [this.name, this.lastname].filter(Boolean).join(' ');
});

// Hash password en create/save
UserSchema.pre('save', async function (next) {
  const user = this as IUser;
  if (!user.isModified('password')) return next();
  user.password = await bcrypt.hash(user.password, 12);
  next();
});

// Hash password en findOneAndUpdate si se modifica
UserSchema.pre('findOneAndUpdate', async function (next) {
  const update = this.getUpdate() as any;
  if (update?.password) {
    update.password = await bcrypt.hash(update.password, 12);
    this.setUpdate(update);
  }
  next();
});

UserSchema.methods.comparePassword = function (candidate: string) {
  // this.password puede no estar seleccionado según la query; asegúrate de seleccionar('+password') al buscar.
  return bcrypt.compare(candidate, (this as IUser).password);
};

// Índices recomendados
// UserSchema.index({ email: 1 }, { unique: true });
// UserSchema.index({ role: 1, isActive: 1 });

// TODO (regla negocio):
// Validar que educationalEmails pertenezcan a dominios permitidos por sus institutions.
// Se haría con un validador async que lea Institution.emailDomains y compare.

const User =
  (mongoose.models.User as IUserModel) ||
  mongoose.model<IUser, IUserModel>('User', UserSchema);

export { User };
export default User;
