import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { IUser, User } from "../models/user.model";
import { IInstitution, Institution } from "../models/institution.model";

// Tipos de autenticación posibles
export type AuthType = "USER" | "INSTITUTION";

// Extiende Request para adjuntar user/institution según el token
export interface AuthRequest extends Request {
  user?: IUser; // usuario autenticado
  institution?: IInstitution; // institución autenticada
  authType?: AuthType; // tipo de actor autenticado
}

// Estructura esperada del payload del JWT
interface JwtPayload {
  userId?: string;
  institutionId?: string;
  type?: AuthType;
}

// Secreto para verificar el JWT (desde variables de entorno)
const JWT_SECRET = process.env.JWT_SECRET as string;

// Middleware de autenticación
// Verifica JWT y adjunta user o institution al request
export async function authMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;

  // Verifica que el header exista y tenga formato Bearer
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No autorizado" });
  }

  const token = authHeader.split(" ")[1];

  try {
    // Verifica y decodifica el token
    const payload = jwt.verify(token, JWT_SECRET) as JwtPayload;

    // Caso: token de usuario
    if (payload.type === "USER" && payload.userId) {
      const user = await User.findById(payload.userId);

      // Usuario inexistente o desactivado
      if (!user || !user.isActive) {
        return res
          .status(401)
          .json({ message: "Usuario inválido o inactivo" });
      }

      // Adjunta el usuario autenticado al request
      req.user = user;
      req.authType = "USER";
      return next();
    }

    // Caso: token de institución
    if (payload.type === "INSTITUTION" && payload.institutionId) {
      const institution = await Institution.findById(payload.institutionId);

      // Institución inexistente
      if (!institution) {
        return res
          .status(401)
          .json({ message: "Institución inválida o inexistente" });
      }

      // Adjunta la institución autenticada al request
      req.institution = institution;
      req.authType = "INSTITUTION";
      return next();
    }

    // Si el payload no coincide con ningún caso válido
    return res.status(401).json({ message: "Token inválido" });
  } catch {
    // Error al verificar o decodificar el token
    return res.status(401).json({ message: "Token inválido" });
  }
}
