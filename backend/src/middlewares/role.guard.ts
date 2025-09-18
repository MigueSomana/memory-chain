import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../models/User';

export function roleGuard(allowed: UserRole[] = []) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Not authenticated' });
      return;
    }
    if (!allowed.includes(req.user.role)) {
      res.status(403).json({ success: false, message: 'Forbidden: insufficient role' });
      return;
    }
    next();
  };
}
