import { Types } from 'mongoose';

export type CertificationStatus = 'pending' | 'certified' | 'rejected';
export type UserRole = 'user' | 'institutionAdmin' | 'superAdmin';
export type InstitutionType = 'university' | 'institute' | 'other';

export interface IAuthor {
  name: string;
  lastname?: string;
  email?: string;
  institution?: Types.ObjectId;
}