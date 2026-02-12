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

const JWT_SECRET = process.env.JWT_SECRET;

// helper: normaliza educationalEmails para asegurar status
function normalizeEducationalEmails(input: any) {
  if (!Array.isArray(input)) return [];
  return input.map((e) => ({
    institution: String(e?.institution ?? "").trim(),
    email: e?.email ? String(e.email).trim() : undefined,
    status:
      e?.status && ["PENDING", "APPROVED", "REJECTED"].includes(String(e.status))
        ? String(e.status)
        : "PENDING",
  })).filter((e) => e.institution.length > 0);
}

// Registro de usuarios normales
export async function register(req: Request, res: Response) {
  try {
    if (!JWT_SECRET) {
      return res
        .status(500)
        .json({ message: "JWT_SECRET no está configurado en el servidor" });
    }

    const { name, lastname, email, password, educationalEmails, role, wallet } =
      req.body;

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: "El email ya está registrado" });
    }

    const user = await User.create({
      name,
      lastname,
      email,
      password,
      educationalEmails: normalizeEducationalEmails(educationalEmails),
      role:
        role && Object.values(UserRole).includes(role)
          ? role
          : UserRole.STUDENT,
      wallet: wallet ? String(wallet).trim() : undefined,
    });

    return res.status(201).json(user); // toJSON quita password
  } catch (err) {
    console.error("Error register", err);
    return res.status(500).json({ message: "Error del servidor" });
  }
}

// Registro de instituciones
export async function registerInstitution(req: Request, res: Response) {
  try {
    if (!JWT_SECRET) {
      return res
        .status(500)
        .json({ message: "JWT_SECRET no está configurado en el servidor" });
    }

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
      wallet,
    } = req.body;

    const existing = await Institution.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: "El email ya está registrado" });
    }

    if (!password || String(password).length < 8) {
      return res
        .status(400)
        .json({ message: "La contraseña debe tener al menos 8 caracteres" });
    }

    const institution = await Institution.create({
      name,
      description,
      country,
      website,
      email,
      password,
      emailDomains: emailDomains ?? [],
      type: type ?? "UNIVERSITY",
      logo: logo ?? "",
      isMember: isMember ?? false,
      canVerify: canVerify ?? false,
      wallet: wallet ? String(wallet).trim() : undefined,
    });

    return res.status(201).json(institution);
  } catch (err) {
    console.error("Error registerInstitution", err);
    return res.status(500).json({ message: "Error del servidor" });
  }
}

// Login unificado
export async function login(req: Request, res: Response) {
  try {
    if (!JWT_SECRET) {
      return res
        .status(500)
        .json({ message: "JWT_SECRET no está configurado en el servidor" });
    }

    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (user) {
      const isMatch = password === user.password; // tu lógica actual
      if (!isMatch) {
        return res.status(400).json({ message: "Credenciales inválidas" });
      }

      const payload: JwtPayload = {
        userId: user._id.toString(),
        type: "USER",
      };

      const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });

      return res.json({
        token,
        type: "USER",
        user: user.toJSON(),
      });
    }

    const institution = await Institution.findOne({ email });
    if (!institution) {
      return res.status(400).json({ message: "Credenciales inválidas" });
    }

    const isInstMatch = password === institution.password; // tu lógica actual
    if (!isInstMatch) {
      return res.status(400).json({ message: "Credenciales inválidas" });
    }

    const payload: JwtPayload = {
      institutionId: institution._id.toString(),
      type: "INSTITUTION",
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });

    return res.json({
      token,
      type: "INSTITUTION",
      institution: institution.toJSON(),
    });
  } catch (err) {
    console.error("Error login", err);
    return res.status(500).json({ message: "Error del servidor" });
  }
}