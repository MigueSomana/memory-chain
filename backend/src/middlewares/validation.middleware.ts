import { Request, Response, NextFunction } from 'express';
import { 
  validateUserData, 
  validateInstitutionData, 
  validateThesisData,
  sanitizeInput 
} from '../services/validation.service';

/**
 * Middleware para validar datos de usuario
 */
export const validateUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Sanitizar inputs
    if (req.body.name) req.body.name = sanitizeInput(req.body.name);
    if (req.body.lastname) req.body.lastname = sanitizeInput(req.body.lastname);
    if (req.body.email) req.body.email = req.body.email.toLowerCase().trim();
    
    const validation = await validateUserData(req.body);
    
    if (!validation.isValid) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validation.errors
      });
    }
    
    next();
  } catch (error) {
    res.status(500).json({ error: 'Validation error' });
  }
};

/**
 * Middleware para validar datos de institución
 */
export const validateInstitution = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Sanitizar inputs
    if (req.body.name) req.body.name = sanitizeInput(req.body.name);
    if (req.body.description) req.body.description = sanitizeInput(req.body.description);
    if (req.body.country) req.body.country = sanitizeInput(req.body.country);
    if (req.body.emailDomain) req.body.emailDomain = req.body.emailDomain.toLowerCase().trim();
    
    const validation = await validateInstitutionData(req.body);
    
    if (!validation.isValid) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validation.errors
      });
    }
    
    next();
  } catch (error) {
    res.status(500).json({ error: 'Validation error' });
  }
};

/**
 * Middleware para validar datos de tesis
 */
export const validateThesis = (req: Request, res: Response, next: NextFunction) => {
  try {
    // Sanitizar inputs de texto
    if (req.body.title) req.body.title = sanitizeInput(req.body.title);
    if (req.body.summary) req.body.summary = sanitizeInput(req.body.summary);
    if (req.body.career) req.body.career = sanitizeInput(req.body.career);
    
    // Procesar autores si vienen como string
    if (typeof req.body.authors === 'string') {
      try {
        req.body.authors = JSON.parse(req.body.authors);
      } catch {
        return res.status(400).json({
          error: 'Invalid authors format',
          details: ['Authors must be a valid JSON array']
        });
      }
    }
    
    // Sanitizar datos de autores
    if (req.body.authors && Array.isArray(req.body.authors)) {
      req.body.authors = req.body.authors.map((author: any) => ({
        name: sanitizeInput(author.name || ''),
        email: (author.email || '').toLowerCase().trim()
      }));
    }
    
    // Procesar keywords si vienen como string
    if (typeof req.body.keywords === 'string') {
      req.body.keywords = req.body.keywords
        .split(',')
        .map((keyword: string) => sanitizeInput(keyword))
        .filter((keyword: string) => keyword.length > 0);
    }
    
    const validation = validateThesisData(req.body);
    
    if (!validation.isValid) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validation.errors
      });
    }
    
    next();
  } catch (error) {
    res.status(500).json({ error: 'Validation error' });
  }
};

/**
 * Middleware para validar IDs de MongoDB
 */
export const validateObjectId = (paramName: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const id = req.params[paramName];
    const objectIdRegex = /^[0-9a-fA-F]{24}$/;
    
    if (!objectIdRegex.test(id)) {
      return res.status(400).json({
        error: 'Invalid ID format',
        details: [`${paramName} must be a valid MongoDB ObjectId`]
      });
    }
    
    next();
  };
};

/**
 * Middleware para validar paginación
 */
export const validatePagination = (req: Request, res: Response, next: NextFunction) => {
  const { page, limit } = req.query;
  
  if (page && (isNaN(Number(page)) || Number(page) < 1)) {
    return res.status(400).json({
      error: 'Invalid pagination',
      details: ['Page must be a positive number']
    });
  }
  
  if (limit && (isNaN(Number(limit)) || Number(limit) < 1 || Number(limit) > 100)) {
    return res.status(400).json({
      error: 'Invalid pagination',
      details: ['Limit must be between 1 and 100']
    });
  }
  
  next();
};

/**
 * Middleware para validar filtros de búsqueda
 */
export const validateSearchFilters = (req: Request, res: Response, next: NextFunction) => {
  const { 
    title, 
    language, 
    degree, 
    verified, 
    dateFrom, 
    dateTo 
  } = req.query;
  
  const errors: string[] = [];
  
  // Validar idioma si se proporciona
  if (language) {
    const allowedLanguages = ['spanish', 'english', 'portuguese', 'french', 'other'];
    if (!allowedLanguages.includes(language as string)) {
      errors.push(`Language must be one of: ${allowedLanguages.join(', ')}`);
    }
  }
  
  // Validar grado si se proporciona
  if (degree) {
    const allowedDegrees = ['bachelor', 'master', 'phd', 'other'];
    if (!allowedDegrees.includes(degree as string)) {
      errors.push(`Degree must be one of: ${allowedDegrees.join(', ')}`);
    }
  }
  
  // Validar verified si se proporciona
  if (verified && !['true', 'false'].includes(verified as string)) {
    errors.push('Verified must be true or false');
  }
  
  // Validar fechas si se proporcionan
  if (dateFrom && isNaN(Date.parse(dateFrom as string))) {
    errors.push('Invalid dateFrom format');
  }
  
  if (dateTo && isNaN(Date.parse(dateTo as string))) {
    errors.push('Invalid dateTo format');
  }
  
  if (dateFrom && dateTo && new Date(dateFrom as string) > new Date(dateTo as string)) {
    errors.push('dateFrom cannot be later than dateTo');
  }
  
  if (errors.length > 0) {
    return res.status(400).json({
      error: 'Invalid search filters',
      details: errors
    });
  }
  
  next(); 
};

/**
 * Middleware para validar permisos de usuario
 */
export const validateUserPermissions = (requiredRole: string[] = []) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    if (requiredRole.length > 0 && !requiredRole.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        details: [`Required role: ${requiredRole.join(' or ')}`]
      });
    }
    
    if (!req.user.isActive) {
      return res.status(403).json({ 
        error: 'Account inactive',
        details: ['User account is deactivated']
      });
    }
    
    next();
  };
};