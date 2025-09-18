import validator from 'validator';
import { Types } from 'mongoose';
import { User, IUser } from '../models/User';
import { Institution } from '../models/Institution';
import { IThesis } from '../models/Thesis';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CID_V0 = /^Qm[1-9A-HJ-NP-Za-km-z]{44}$/;
const CID_V1 = /^bafy[1-9A-HJ-NP-Za-km-z]+$/;
const HASH_HEX = /^[a-f0-9]{64}$/i;

export async function validateUserData(p: Partial<IUser> & { idForUpdate?: string }): Promise<ValidationResult> {
  const errors: string[] = [];

  if (p.name !== undefined && !String(p.name).trim()) errors.push('name is required');
  if (p.email !== undefined) {
    const email = String(p.email).toLowerCase().trim();
    if (!EMAIL_REGEX.test(email)) errors.push('email format is invalid');
    // unique (exclude current id)
    const exists = await User.exists({ email, _id: { $ne: p.idForUpdate } });
    if (exists) errors.push('email already in use');
  }
  if (p.password !== undefined && String(p.password).length < 8) {
    errors.push('password must be at least 8 characters');
  }
  if (p.educationalEmails !== undefined) {
    for (const e of p.educationalEmails) {
      if (!EMAIL_REGEX.test(String(e))) errors.push(`invalid educational email: ${e}`);
    }
  }
  if (p.institutions) {
    for (const id of p.institutions as any[]) {
      if (!Types.ObjectId.isValid(String(id))) {
        errors.push(`invalid institution id: ${id}`);
      }
    }
  }

  return { isValid: errors.length === 0, errors };
}

export async function validateInstitutionData(p: Partial<any>): Promise<ValidationResult> {
  const errors: string[] = [];
  if (p.name !== undefined && !String(p.name).trim()) errors.push('name is required');
  if (p.country !== undefined && !String(p.country).trim()) errors.push('country is required');

  if (p.website) {
    const ok = validator.isURL(String(p.website), { protocols: ['http','https'], require_protocol: true });
    if (!ok) errors.push('website is not a valid URL (must include http/https)');
  }
  if (p.emailDomain) {
    if (!String(p.emailDomain).includes('.')) errors.push('emailDomain looks invalid');
  }
  if (p.emailDomains) {
    for (const d of p.emailDomains as string[]) {
      if (typeof d !== 'string' || !d.includes('.')) errors.push(`invalid email domain: ${d}`);
    }
  }
  if (p.type && !['public','private','hybrid'].includes(String(p.type))) {
    errors.push('type must be one of public|private|hybrid');
  }
  return { isValid: errors.length === 0, errors };
}

export async function validateThesisData(p: Partial<IThesis>): Promise<ValidationResult> {
  const errors: string[] = [];

  if (p.title !== undefined && !String(p.title).trim()) errors.push('title is required');
  if (p.summary !== undefined && !String(p.summary).trim()) errors.push('summary is required');
  if (p.language !== undefined && !String(p.language).trim()) errors.push('language is required');
  if (p.degree !== undefined && !String(p.degree).trim()) errors.push('degree is required');

  if (p.authors) {
    if (!Array.isArray(p.authors) || p.authors.length === 0) {
      errors.push('authors must be a non-empty array');
    } else {
      const emails = new Set<string>();
      for (let i=0;i<p.authors.length;i++) {
        const a: any = p.authors[i];
        if (!a?.name || !String(a.name).trim()) errors.push(`author[${i}].name is required`);
        if (a.email) {
          if (!EMAIL_REGEX.test(String(a.email))) errors.push(`author[${i}].email is invalid`);
          const e = String(a.email).toLowerCase();
          if (emails.has(e)) errors.push('author emails must be unique');
          emails.add(e);
        }
      }
    }
  }

  if (p.institution) {
    if (!Types.ObjectId.isValid(String(p.institution))) errors.push('institution must be a valid ObjectId');
  }
  if (p.year !== undefined) {
    const y = Number(p.year);
    if (Number.isNaN(y) || y < 1900 || y > 2100) errors.push('year must be between 1900 and 2100');
  }

  if (p.fileHash !== undefined && !HASH_HEX.test(String(p.fileHash))) {
    errors.push('fileHash must be a 64-char hex sha256');
  }
  if (p.ipfsCid !== undefined) {
    const s = String(p.ipfsCid);
    if (!(CID_V0.test(s) || CID_V1.test(s))) errors.push('ipfsCid is not a valid CIDv0/v1');
  }

  return { isValid: errors.length === 0, errors };
}

/**
 * Regla de negocio opcional:
 * educationalEmails del usuario deben pertenecer a alguno de los dominios de sus instituciones.
 * Retorna lista de correos que NO cumplen la regla.
 */
export async function checkEducationalEmailDomains(userId: string): Promise<{ invalidEmails: string[] }> {
  if (!Types.ObjectId.isValid(userId)) throw new Error('invalid user id');
  const user = await User.findById(userId).select('educationalEmails institutions');
  if (!user) throw new Error('user not found');
  if (!user.institutions?.length || !user.educationalEmails?.length) return { invalidEmails: [] };

  const institutions = await Institution.find({ _id: { $in: user.institutions } }).select('emailDomains');
  const domains = new Set<string>();
  institutions.forEach(inst => (inst.emailDomains || []).forEach(d => domains.add(d.toLowerCase())));
  const invalid = user.educationalEmails.filter((e) => {
    const domain = String(e).split('@')[1]?.toLowerCase();
    return domain ? !domains.has(domain) : true;
  });
  return { invalidEmails: invalid };
}
