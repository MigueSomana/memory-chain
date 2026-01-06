import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model";
import { UserRole } from "../models/types";
import { Institution } from "../models/institution.model";

// Tipo de token según el actor que inicia sesión
type TokenType = "USER" | "INSTITUTION";

// Payload del JWT (depende si es usuario o institución)
interface JwtPayload {
  userId?: string;
  institutionId?: string;
  type: TokenType;
}

// Secreto para firmar/verificar JWT (debe venir en .env)
const JWT_SECRET = process.env.JWT_SECRET as string;

// Registro de usuarios normales
export async function register(req: Request, res: Response) {
  try {
    const {
      name,
      lastname,
      email,
      password,
      educationalEmails,
      role,
    } = req.body;

    // Evita duplicar cuentas con el mismo email
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: "El email ya está registrado" });
    }

    // Crea el usuario (idealmente password llega ya hasheada desde el model/middleware)
    const user = await User.create({
      name,
      lastname,
      email,
      password,
      educationalEmails: educationalEmails ?? [], // por defecto vacío
      role:
        role && Object.values(UserRole).includes(role)
          ? role
          : UserRole.STUDENT, // rol por defecto
    });

    return res.status(201).json(user); // password ya viene oculto por toJSON
  } catch (err) {
    console.error("Error register", err);
    return res.status(500).json({ message: "Error del servidor" });
  }
}

// Registro de instituciones
export async function registerInstitution(req: Request, res: Response) {
  try {
    const {
      name,
      description,
      country,
      website,
      email,
      password,
      emailDomains,
      type,
      logo,
      isMember,
      canVerify,
    } = req.body;

    // Evita duplicar instituciones con el mismo email
    const existing = await Institution.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: "El email ya está registrado" });
    }

    // Validación mínima de password
    if (!password || String(password).length < 8) {
      return res
        .status(400)
        .json({ message: "La contraseña debe tener al menos 8 caracteres" });
    }

    // Crea la institución (idealmente password llega ya hasheada)
    const institution = await Institution.create({
      name,
      description,
      country,
      website,
      email,
      password,
      emailDomains: emailDomains ?? [], // dominios institucionales permitidos
      type: type ?? "UNIVERSITY", // tipo por defecto
      logo: logo ?? "",
      isMember: isMember ?? false, // membresía por defecto
      canVerify: canVerify ?? false, // permiso de certificar por defecto
    });

    // toJSON del modelo ya quita el password
    return res.status(201).json(institution);
  } catch (err) {
    console.error("Error registerInstitution", err);
    return res.status(500).json({ message: "Error del servidor" });
  }
}

// Login unificado: primero intenta como usuario, si no existe intenta como institución
export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body;

    // 1) Intentar como usuario normal
    const user = await User.findOne({ email });
    if (user) {
      let isMatch = false;

      // Aquí normalmente iría bcrypt.compare(password, user.password)
      // En tu caso estás comparando directo (posible legacy / texto plano)
      try {
        if(password === user.password){
        isMatch = true;
      }
      } catch {
        isMatch = false;
      }

      // fallback por compatibilidad con contraseñas en texto plano antiguas
      if (!isMatch && password === user.password) {
        isMatch = true;
      }

      if (!isMatch) {
        return res.status(400).json({ message: "Credenciales inválidas" });
      }

      // Payload de JWT para usuario
      const payload: JwtPayload = {
        userId: user._id.toString(),
        type: "USER",
      };

      // Firma token con expiración
      const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });

      return res.json({
        token,
        type: "USER",
        user: user.toJSON(), // sin password
      });
    }

    // 2) Si no es usuario, intentar como institución
    const institution = await Institution.findOne({ email });
    if (!institution) {
      return res.status(400).json({ message: "Credenciales inválidas" });
    }

    let isInstMatch = false;

    // Igual que arriba: aquí normalmente sería bcrypt.compare(...)
    try {
      if(password === institution.password){
        isInstMatch = true;
      }
    } catch {
      isInstMatch = false;
    }

    // fallback por si están en texto plano
    if (!isInstMatch && password === institution.password) {
      isInstMatch = true;
    }

    if (!isInstMatch) {
      return res.status(400).json({ message: "Credenciales inválidas" });
    }

    // Payload de JWT para institución
    const payload: JwtPayload = {
      institutionId: institution._id.toString(),
      type: "INSTITUTION",
    };

    // Firma token con expiración
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });

    return res.json({
      token,
      type: "INSTITUTION",
      institution: institution.toJSON(), // sin password
    });
  } catch (err) {
    console.error("Error login", err);
    return res.status(500).json({ message: "Error del servidor" });
  }
}
