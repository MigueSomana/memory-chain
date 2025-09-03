import { Request, Response, NextFunction } from 'express';
import { IUser } from '../models/User';
import { Types } from 'mongoose';

// Importar tipos personalizados
import '../types/express';

export function roleGuard(roles: Array<IUser['role']>) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user as (IUser & { _id: Types.ObjectId }) | undefined;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    if (!roles.includes(user.role)) return res.status(403).json({ error: 'Forbidden' });
    next();
  };
}