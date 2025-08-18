import validator from 'validator';
import { User } from '../models/User';
import Institution from '../models/Institution';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Valida datos de usuario
 */
export const validateUserData = async (userData: {
  name?: string;
  lastname?: string;
  email?: string;
  password?: string;
  educationalEmails?: string[];
}): Promise<ValidationResult> => {
  const errors: string[] = [];
  
  // Validar nombre
  if (userData.name && (!userData.name.trim() || userData.name.length < 2)) {
    errors.push('Name must be at least 2 characters long');
  }
  
  // Validar apellido
  if (userData.lastname && (!userData.lastname.trim() || userData.lastname.length < 2)) {
    errors.push('Last name must be at least 2 characters long');
  }
  
  // Validar email principal
  if (userData.email) {
    if (!validator.isEmail(userData.email)) {
      errors.push('Invalid email format');
    } else {
      // Verificar si el email ya existe
      const existingUser = await User.findOne({ email: userData.email });
      if (existingUser) {
        errors.push('Email already in use');
      }
    }
  }
  
  // Validar contraseña
  if (userData.password) {
    if (userData.password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(userData.password)) {
      errors.push('Password must contain at least one lowercase letter, one uppercase letter, and one number');
    }
  }
  
  // Validar emails educativos
  if (userData.educationalEmails) {
    for (const email of userData.educationalEmails) {
      if (!validator.isEmail(email)) {
        errors.push(`Invalid educational email format: ${email}`);
      }
      if (!/\.edu(\.[a-z]{2,3})?$/i.test(email)) {
        errors.push(`Email must be from an educational domain (.edu): ${email}`);
      }
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Valida datos de institución
 */
export const validateInstitutionData = async (institutionData: {
  name?: string;
  emailDomain?: string;
  website?: string;
  country?: string;
}): Promise<ValidationResult> => {
  const errors: string[] = [];
  
  // Validar nombre
  if (institutionData.name) {
    if (!institutionData.name.trim() || institutionData.name.length < 3) {
      errors.push('Institution name must be at least 3 characters long');
    }
    
    // Verificar si el nombre ya existe
    const existingInstitution = await Institution.findOne({ 
      name: new RegExp(`^${institutionData.name}$`, 'i') 
    });
    if (existingInstitution) {
      errors.push('Institution name already exists');
    }
  }
  
  // Validar dominio de email
  if (institutionData.emailDomain) {
    if (!/^@[^\s@]+\.edu(\.[a-z]{2,3})?$/i.test(institutionData.emailDomain)) {
      errors.push('Invalid educational email domain format (must be @domain.edu)');
    }
    
    // Verificar si el dominio ya existe
    const existingDomain = await Institution.findOne({ 
      emailDomain: institutionData.emailDomain 
    });
    if (existingDomain) {
      errors.push('Email domain already registered');
    }
  }
  
  // Validar website
  if (institutionData.website && !validator.isURL(institutionData.website)) {
    errors.push('Invalid website URL format');
  }
  
  // Validar país
  if (institutionData.country && institutionData.country.length < 2) {
    errors.push('Country name must be at least 2 characters long');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Valida datos de tesis
 */
export const validateThesisData = (thesisData: {
  title?: string;
  authors?: Array<{name: string; email: string}>;
  summary?: string;
  keywords?: string[];
  language?: string;
  publicationDate?: string;
  career?: string;
  degree?: string;
  institution?: string;
}): ValidationResult => {
  const errors: string[] = [];
  
  // Validar título
  if (!thesisData.title || thesisData.title.trim().length < 10) {
    errors.push('Title must be at least 10 characters long');
  }
  
  if (thesisData.title && thesisData.title.length > 500) {
    errors.push('Title must not exceed 500 characters');
  }
  
  // Validar autores
  if (!thesisData.authors || thesisData.authors.length === 0) {
    errors.push('At least one author is required');
  } else {
    thesisData.authors.forEach((author, index) => {
      if (!author.name || author.name.trim().length < 2) {
        errors.push(`Author ${index + 1}: Name must be at least 2 characters long`);
      }
      if (!author.email || !validator.isEmail(author.email)) {
        errors.push(`Author ${index + 1}: Invalid email format`);
      }
    });
  }
  
  // Validar resumen
  if (!thesisData.summary || thesisData.summary.trim().length < 50) {
    errors.push('Summary must be at least 50 characters long');
  }
  
  if (thesisData.summary && thesisData.summary.length > 2000) {
    errors.push('Summary must not exceed 2000 characters');
  }
  
  // Validar palabras clave
  if (thesisData.keywords && thesisData.keywords.length > 10) {
    errors.push('Maximum 10 keywords allowed');
  }
  
  // Validar idioma
  const allowedLanguages = ['spanish', 'english', 'portuguese', 'french', 'other'];
  if (thesisData.language && !allowedLanguages.includes(thesisData.language)) {
    errors.push(`Language must be one of: ${allowedLanguages.join(', ')}`);
  }
  
  // Validar fecha de publicación
  if (thesisData.publicationDate) {
    const pubDate = new Date(thesisData.publicationDate);
    if (isNaN(pubDate.getTime())) {
      errors.push('Invalid publication date format');
    } else if (pubDate > new Date()) {
      errors.push('Publication date cannot be in the future');
    }
  }
  
  // Validar carrera
  if (!thesisData.career || thesisData.career.trim().length < 3) {
    errors.push('Career must be at least 3 characters long');
  }
  
  // Validar grado
  const allowedDegrees = ['bachelor', 'master', 'phd', 'other'];
  if (!thesisData.degree || !allowedDegrees.includes(thesisData.degree)) {
    errors.push(`Degree must be one of: ${allowedDegrees.join(', ')}`);
  }
  
  // Validar institución
  if (!thesisData.institution) {
    errors.push('Institution is required');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};  

/**
 * Valida asociación de usuario con institución
 */
export const validateUserInstitutionAssociation = async (
  userEmail: string, 
  institutionId: string
): Promise<ValidationResult> => {
  const errors: string[] = [];
  
  try {
    const institution = await Institution.findById(institutionId);
    if (!institution) {
      errors.push('Institution not found');
      return { isValid: false, errors };
    }
    
    // Verificar si el email del usuario coincide con el dominio de la institución
    const emailDomain = '@' + userEmail.split('@')[1];
    if (emailDomain !== institution.emailDomain) {
      errors.push(`Email domain does not match institution domain (${institution.emailDomain})`);
    }
    
    // Verificar si la institución está activa
    if (!institution.isMember) {
      errors.push('Institution is not an active member');
    }
    
  } catch (error) {
    errors.push('Error validating institution association');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Sanitiza y normaliza datos de entrada
 */
export const sanitizeInput = (input: string): string => {
  return validator.escape(validator.trim(input));
};

export const normalizeEmail = (email: string): string => {
  return validator.normalizeEmail(email) || email.toLowerCase();
};