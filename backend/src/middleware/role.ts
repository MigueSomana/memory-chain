import { Response, NextFunction } from "express";
import { AuthRequest } from "./auth";
import { UserRole } from "../models/types";

// Middleware de autorización por rol
// Permite el acceso solo a usuarios con los roles indicados
export function requireRole(...roles: UserRole[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    // Debe venir un usuario autenticado
    if (!req.user) {
      return res.status(401).json({ message: "No autorizado" });
    }

    // Verifica que el rol del usuario esté dentro de los permitidos
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: "No tienes permisos" });
    }

    // Usuario autorizado, continúa con el siguiente middleware
    next();
  };
}
