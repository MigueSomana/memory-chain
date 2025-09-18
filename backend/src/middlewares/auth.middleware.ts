import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';

const JWT_SECRET: string = process.env.JWT_SECRET || 'changeme';

declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      res.status(401).json({ success: false, message: 'Authorization header missing' });
      return;
    }
    const token = header.split(' ')[1];
    const payload = jwt.verify(token, JWT_SECRET) as { id: string; role: string };

    const user = await User.findById(payload.id)
      .select('-password')
      .populate('institutions', 'name emailDomains');

    if (!user) {
      res.status(401).json({ success: false, message: 'User not found' });
      return;
    }

    req.user = user;
    next();
  } catch (_err) {
    res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
}
