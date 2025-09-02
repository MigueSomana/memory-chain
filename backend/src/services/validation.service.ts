import validator from 'validator';
import { User } from '../models/User';
import Institution from '../models/Institution';

export interface ValidationResult { isValid: boolean; errors: string[]; }

export async function validateUserData(p: {
  name?: string; lastname?: string; email?: string; password?: string;
  educationalEmails?: string[]; institutions?: string[];
}): Promise<ValidationResult> {
  const errors: string[] = [];

  if (p.email && !validator.isEmail(p.email)) errors.push('Invalid email');
  if (p.password) {
    if (p.password.length < 8) errors.push('Password must be at least 8 chars');
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(p.password)) errors.push('Password must contain a-z, A-Z and 0-9');
  }
  if (p.educationalEmails) {
    for (const e of p.educationalEmails) {
      if (!validator.isEmail(e)) errors.push(`Invalid educational email: ${e}`);
    }
  }
  if (p.institutions) {
    for (const id of p.institutions) {
      const exists = await Institution.exists({ _id: id });
      if (!exists) errors.push(`Institution not found: ${id}`);
    }
  }
  const existing = p.email ? await User.findOne({ email: p.email }) : null;
  if (existing) errors.push('Email already in use');

  return { isValid: errors.length === 0, errors };
}

export async function validateInstitutionData(p: {
  name?: string; country?: string; emailDomain?: string; type?: string;
}) {
  const errors: string[] = [];
  if (p.emailDomain && !/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(p.emailDomain)) errors.push('Invalid emailDomain');
  if (p.type && !['public', 'private', 'hybrid'].includes(p.type)) errors.push('Invalid type');
  return { isValid: errors.length === 0, errors };
}

export function sanitizeInput(s: string) {
  return s.replace(/[<>$]/g, '').trim();
}

export function validateThesisData(p: {
  title?: string; authors?: Array<{name:string; email:string}>;
  summary?: string; language?: string; degree?: string; workType?: string;
  institution?: string;
}) {
  const errors: string[] = [];
  if (!p.title) errors.push('title required');
  if (!p.authors || p.authors.length === 0) errors.push('authors required');
  if (p.authors) {
    for (const a of p.authors) {
      if (!a.name?.trim()) errors.push('author.name required');
      if (!validator.isEmail(a.email)) errors.push(`invalid author.email: ${a.email}`);
    }
  }
  if (!p.language) errors.push('language required');
  if (!p.degree) errors.push('degree required');
  if (!p.workType) errors.push('workType required');
  if (!p.summary) errors.push('summary required');
  return { isValid: errors.length === 0, errors };
}
