import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model";
import { UserRole } from "../models/types";
import { Institution } from "../models/institution.model";

type TokenType = "USER" | "INSTITUTION";

interface JwtPayload {
  userId?: string;
  institutionId?: string;
  type: TokenType;
}

const JWT_SECRET = process.env.JWT_SECRET as string;

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

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: "El email ya está registrado" });
    }

    const user = await User.create({
      name,
      lastname,
      email,
      password,
      educationalEmails: educationalEmails ?? [],
      role:
        role && Object.values(UserRole).includes(role)
          ? role
          : UserRole.REGULAR,
    });

    return res.status(201).json(user); // password ya viene oculto por toJSON
  } catch (err) {
    console.error("Error register", err);
    return res.status(500).json({ message: "Error del servidor" });
  }
}
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
    });

    // toJSON del modelo ya quita el password
    return res.status(201).json(institution);
  } catch (err) {
    console.error("Error registerInstitution", err);
    return res.status(500).json({ message: "Error del servidor" });
  }
}

export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body;

    // 1) Intentar como usuario normal
    const user = await User.findOne({ email });
    if (user) {
      let isMatch = false;
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

    // 2) Si no es usuario, intentar como institución
    const institution = await Institution.findOne({ email });
    if (!institution) {
      return res.status(400).json({ message: "Credenciales inválidas" });
    }

    let isInstMatch = false;
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
