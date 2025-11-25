import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserRole } from '../models/types';

export interface AuthPayload {
  userId: string;
  role: UserRole;
}

export interface AuthRequest extends Request {
  user?: AuthPayload;
}

export function authMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Token no proporcionado' });
  }

  const token = authHeader.split(' ')[1];
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('Falta JWT_SECRET en .env');
  }

  try {
    const decoded = jwt.verify(token, secret) as AuthPayload;
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ message: 'Token inválido' });
  }
}

export function requireRole(roles: UserRole[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'No autorizado' });
    }
    next();
  };
}