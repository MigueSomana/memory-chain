import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { IUser, User } from "../models/user.model";
import { IInstitution, Institution } from "../models/institution.model";

export type AuthType = "USER" | "INSTITUTION";

export interface AuthRequest extends Request {
  user?: IUser;
  institution?: IInstitution;
  authType?: AuthType;
}

interface JwtPayload {
  userId?: string;
  institutionId?: string;
  type?: AuthType;
}

const JWT_SECRET = process.env.JWT_SECRET as string;

export async function authMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No autorizado" });
  }

  const token = authHeader.split(" ")[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET) as JwtPayload;

    if (payload.type === "USER" && payload.userId) {
      const user = await User.findById(payload.userId);
      if (!user || !user.isActive) {
        return res
          .status(401)
          .json({ message: "Usuario inválido o inactivo" });
      }
      req.user = user;
      req.authType = "USER";
      return next();
    }

    if (payload.type === "INSTITUTION" && payload.institutionId) {
      const institution = await Institution.findById(payload.institutionId);
      if (!institution) {
        return res
          .status(401)
          .json({ message: "Institución inválida o inexistente" });
      }
      req.institution = institution;
      req.authType = "INSTITUTION";
      return next();
    }

    return res.status(401).json({ message: "Token inválido" });
  } catch {
    return res.status(401).json({ message: "Token inválido" });
  }
}
