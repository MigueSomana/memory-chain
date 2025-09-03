import validator from 'validator';
import { User } from '../models/User';
import Institution from '../models/Institution';
import { Types } from 'mongoose';

export interface ValidationResult { 
  isValid: boolean; 
  errors: string[]; 
}

export async function validateUserData(p: {
  name?: string; 
  lastname?: string; 
  email?: string; 
  password?: string;
  educationalEmails?: string[]; 
  institutions?: string[];
  _id?: string; // Para updates
}): Promise<ValidationResult> {
  const errors: string[] = [];

  // Validaciones básicas
  if (!p.name?.trim()) errors.push('Name is required');
  if (p.name && p.name.trim().length < 2) errors.push('Name must be at least 2 characters');
  if (p.name && p.name.trim().length > 100) errors.push('Name cannot exceed 100 characters');

  if (!p.email?.trim()) errors.push('Email is required');
  if (p.email && !validator.isEmail(p.email)) errors.push('Invalid email format');

  if (p.password) {
    if (p.password.length < 8) errors.push('Password must be at least 8 characters');
    if (!/(?=.*[a-z])/.test(p.password)) errors.push('Password must contain at least one lowercase letter');
    if (!/(?=.*[A-Z])/.test(p.password)) errors.push('Password must contain at least one uppercase letter');
    if (!/(?=.*\d)/.test(p.password)) errors.push('Password must contain at least one number');
  }

  // Validar emails educativos
  if (p.educationalEmails) {
    for (const e of p.educationalEmails) {
      if (!validator.isEmail(e)) errors.push(`Invalid educational email: ${e}`);
    }
  }

  // Validar instituciones
  if (p.institutions) {
    for (const id of p.institutions) {
      if (!Types.ObjectId.isValid(id)) {
        errors.push(`Invalid institution ID format: ${id}`);
      } else {
        const exists = await Institution.exists({ _id: id });
        if (!exists) errors.push(`Institution not found: ${id}`);
      }
    }
  }

  // Verificar email único (solo si no es update del mismo usuario)
  if (p.email) {
    const query: any = { email: p.email };
    if (p._id) query._id = { $ne: p._id };
    
    const existing = await User.findOne(query);
    if (existing) errors.push('Email already in use');
  }

  return { isValid: errors.length === 0, errors };
}

export async function validateInstitutionData(p: {
  name?: string; 
  country?: string; 
  emailDomain?: string; 
  type?: string;
  _id?: string; // Para updates
}): Promise<ValidationResult> {
  const errors: string[] = [];

  if (!p.name?.trim()) errors.push('Institution name is required');
  if (p.name && p.name.trim().length < 2) errors.push('Institution name must be at least 2 characters');

  if (!p.country?.trim()) errors.push('Country is required');
  if (p.country && p.country.trim().length !== 2) errors.push('Country must be a valid 2-letter ISO code');

  if (!p.emailDomain?.trim()) errors.push('Email domain is required');
  if (p.emailDomain && !/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(p.emailDomain)) {
    errors.push('Invalid email domain format (e.g., university.edu)');
  }

  if (!p.type) errors.push('Institution type is required');
  if (p.type && !['public', 'private', 'hybrid'].includes(p.type)) {
    errors.push('Institution type must be: public, private, or hybrid');
  }

  // Verificar emailDomain único
  if (p.emailDomain) {
    const query: any = { emailDomain: p.emailDomain.toLowerCase() };
    if (p._id) query._id = { $ne: p._id };
    
    const existing = await Institution.findOne(query);
    if (existing) errors.push('Email domain already registered');
  }

  return { isValid: errors.length === 0, errors };
}

export function sanitizeInput(s: string): string {
  if (typeof s !== 'string') return '';
  return s.replace(/[<>${}]/g, '').trim();
}

export function validateThesisData(p: {
  title?: string; 
  authors?: Array<{name: string; email: string}>;
  summary?: string; 
  language?: string; 
  degree?: string; 
  workType?: string;
  institution?: string;
  keywords?: string[];
}): ValidationResult {
  const errors: string[] = [];

  // Validaciones obligatorias
  if (!p.title?.trim()) errors.push('Title is required');
  if (p.title && p.title.trim().length < 5) errors.push('Title must be at least 5 characters');
  if (p.title && p.title.trim().length > 500) errors.push('Title cannot exceed 500 characters');

  if (!p.summary?.trim()) errors.push('Summary is required');
  if (p.summary && p.summary.trim().length < 20) errors.push('Summary must be at least 20 characters');
  if (p.summary && p.summary.trim().length > 5000) errors.push('Summary cannot exceed 5000 characters');

  if (!p.language?.trim()) errors.push('Language is required');
  const allowedLanguages = ['es', 'en', 'pt', 'fr', 'de', 'it', 'other'];
  if (p.language && !allowedLanguages.includes(p.language)) {
    errors.push(`Language must be one of: ${allowedLanguages.join(', ')}`);
  }

  if (!p.degree?.trim()) errors.push('Degree is required');
  if (!p.workType?.trim()) errors.push('Work type is required');
  if (!p.institution?.trim()) errors.push('Institution is required');
  
  if (p.institution && !Types.ObjectId.isValid(p.institution)) {
    errors.push('Invalid institution ID format');
  }

  // Validar autores
  if (!p.authors || !Array.isArray(p.authors) || p.authors.length === 0) {
    errors.push('At least one author is required');
  } else {
    p.authors.forEach((author, index) => {
      if (!author.name?.trim()) {
        errors.push(`Author ${index + 1}: name is required`);
      }
      if (!author.email?.trim()) {
        errors.push(`Author ${index + 1}: email is required`);
      } else if (!validator.isEmail(author.email)) {
        errors.push(`Author ${index + 1}: invalid email format (${author.email})`);
      }
    });

    // Verificar emails únicos entre autores
    const emails = p.authors.map(a => a.email?.toLowerCase()).filter(Boolean);
    const uniqueEmails = new Set(emails);
    if (emails.length !== uniqueEmails.size) {
      errors.push('Author emails must be unique');
    }
  }

  return { isValid: errors.length === 0, errors };
}