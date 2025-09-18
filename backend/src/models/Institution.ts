import mongoose, { Document, Model, Schema } from 'mongoose';

export interface Department {
  name: string;
  code?: string;
  description?: string;
}

export type InstitutionType = 'public' | 'private' | 'hybrid';

export interface IInstitution extends Document {
  name: string;
  description?: string;
  country: string;
  website?: string;
  /**
   * Campo legado para compatibilidad con código existente.
   * Recomendado migrar a `emailDomains` (array).
   */
  emailDomain?: string; // ej: "univ.edu"
  emailDomains: string[]; // soporta múltiples dominios
  type: InstitutionType;
  departments: Department[];
  isMember: boolean; // plan de membresía (modelo de negocio)
  canVerify: boolean; // puede certificar/verificar tesis
  logo?: string;

  createdAt: Date;
  updatedAt: Date;
}

type IInstitutionModel = Model<IInstitution>;

const URL_REGEX =
  /^(https?:\/\/)[\w\-]+(\.[\w\-]+)+(:\d+)?(\/\S*)?$/i;

const DepartmentSchema = new Schema<Department>(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, trim: true },
    description: { type: String, trim: true },
  },
  { _id: false }
);

const InstitutionSchema = new Schema<IInstitution, IInstitutionModel>(
  {
    name: { type: String, required: true, trim: true, index: true, unique: true },
    description: { type: String, trim: true },
    country: { type: String, required: true, trim: true, index: true },
    website: {
      type: String,
      trim: true,
      validate: {
        validator: function (v: string | undefined) {
          if (!v) return true;
          return URL_REGEX.test(v);
        },
        message: 'El sitio web no parece una URL válida.',
      },
    },
    emailDomain: { type: String, trim: true }, // legacy
    emailDomains: {
      type: [String],
      default: function (this: any) {
        // Arranca con el legado si existe
        return this.emailDomain ? [this.emailDomain] : [];
      },
      validate: {
        validator: function (arr: string[]) {
          return arr.every((d) => typeof d === 'string' && d.includes('.'));
        },
        message: 'emailDomains contiene un dominio inválido.',
      },
      index: true,
    },
    type: {
      type: String,
      enum: ['public', 'private', 'hybrid'],
      required: true,
      index: true,
    },
    departments: { type: [DepartmentSchema], default: [] },
    isMember: { type: Boolean, default: false, index: true },
    canVerify: { type: Boolean, default: false, index: true },
    logo: { type: String, trim: true },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual para compatibilidad: toma el primero de emailDomains
InstitutionSchema.virtual('primaryEmailDomain').get(function (this: IInstitution) {
  return this.emailDomains?.[0] ?? this.emailDomain;
});

// Índices avanzados
InstitutionSchema.index({ 'departments.name': 1 });
InstitutionSchema.index({ name: 'text', 'departments.name': 'text' });

const Institution =
  (mongoose.models.Institution as IInstitutionModel) ||
  mongoose.model<IInstitution, IInstitutionModel>('Institution', InstitutionSchema);

export { Institution };
export default Institution;
