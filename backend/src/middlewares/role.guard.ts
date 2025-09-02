// src/middlewares/role.guard.ts
import { Request, Response, NextFunction } from 'express';
import { IUser } from '../models/User';

export function roleGuard(roles: Array<IUser['role']>) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user as IUser | undefined;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    if (!roles.includes(user.role)) return res.status(403).json({ error: 'Forbidden' });
    next();
  };
}
