import { Request, Response, NextFunction } from 'express';
import { 
  validateUserData, 
  validateInstitutionData, 
  validateThesisData,
  sanitizeInput 
} from '../services/validation.service';
import { IUser } from '../models/User';
import { Types } from 'mongoose';

// Importar tipos personalizados explícitamente
import '../types/express';

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
 * Middleware para validar permisos de usuario
 */
export const validateUserPermissions = (requiredRole: string[] = []) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Usar casting directo para evitar el error de TypeScript
    const user = req.user as (IUser & { _id: Types.ObjectId }) | undefined;
    
    if (!user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    if (requiredRole.length > 0 && !requiredRole.includes(user.role)) {
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        details: [`Required role: ${requiredRole.join(' or ')}`]
      });
    }
    
    if (!user.isActive) {
      return res.status(403).json({ 
        error: 'Account inactive',
        details: ['User account is deactivated']
      });
    }
    
    next();
  };
};