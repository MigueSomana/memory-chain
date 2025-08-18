import { IUser } from "../../models/User";
import { Types } from "mongoose";

declare global {
  namespace Express {
    interface Request {
      user?: IUser & {
        _id: Types.ObjectId;
      };
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