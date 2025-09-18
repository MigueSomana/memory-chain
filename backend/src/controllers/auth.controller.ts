import { Request, Response, NextFunction } from 'express';
import jwt, { Secret, SignOptions } from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { findUserByEmail } from '../services/user.service';

// --- Tipos compatibles con jsonwebtoken v9 ---
type TimeUnit = 'ms' | 's' | 'm' | 'h' | 'd' | 'w' | 'y';
type ExpiresIn = `${number}${TimeUnit}` | number;

const JWT_SECRET: Secret = (process.env.JWT_SECRET ?? 'changeme') as Secret;
const JWT_EXPIRES: ExpiresIn = (process.env.JWT_EXPIRES ?? '7d') as ExpiresIn;

// Type guard para obtener un string de cualquier _id (ObjectId|string|desconocido)
function toIdString(id: unknown): string {
  if (typeof id === 'string') return id;
  if (id && typeof (id as any).toString === 'function') return (id as any).toString();
  throw new Error('Invalid _id type');
}

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ success: false, message: 'Email and password are required' });
      return;
    }

    const user = await findUserByEmail(email, { includePassword: true });
    if (!user) {
      res.status(401).json({ success: false, message: 'Invalid credentials' });
      return;
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      res.status(401).json({ success: false, message: 'Invalid credentials' });
      return;
    }

    const payload = { id: toIdString(user._id), role: user.role };
    const options: SignOptions = { expiresIn: JWT_EXPIRES };
    const token = jwt.sign(payload, JWT_SECRET, options);

    res.json({ success: true, data: { token, user: user.toJSON() } });
  } catch (err) {
    next(err);
  }
}

export async function me(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json({ success: true, data: req.user });
  } catch (err) {
    next(err);
  }
}
