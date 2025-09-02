import type { IUser } from '../../models/User';
import type { Types } from 'mongoose';

declare global {
  namespace Express {
    interface Request {
      user?: (IUser & { _id: Types.ObjectId }) | null;
      fileInfo?: {
        originalName: string;
        filename: string;
        path: string;
        size: number;
        mimetype: string;
      };
    }
  }
}

export {};