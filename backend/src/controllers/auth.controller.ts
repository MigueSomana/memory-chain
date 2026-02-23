import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model";
import { UserRole } from "../models/types";
import { Institution } from "../models/institution.model";
import {
  assertAddressWithFunds,
  assertPrivateKeyWithFunds,
} from "../services/wallet.validation";

type TokenType = "USER" | "INSTITUTION";

interface JwtPayload {
  userId?: string;
  institutionId?: string;
  type: TokenType;
}

const JWT_SECRET = process.env.JWT_SECRET;

function normalizeEducationalEmails(input: any) {
  if (!Array.isArray(input)) return [];
  return input
    .map((e) => ({
      institution: String(e?.institution ?? "").trim(),
      email: e?.email ? String(e.email).trim() : undefined,
      status:
        e?.status && ["PENDING", "APPROVED", "REJECTED"].includes(String(e.status))
          ? String(e.status)
          : "PENDING",
    }))
    .filter((e) => e.institution.length > 0);
}

// =====================
// REGISTER USER
// =====================
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

    // ✅ Wallet usuario es opcional. Si viene, validamos address + fondos.
    const w = wallet ? String(wallet).trim() : "";
    if (w) {
      try {
        await assertAddressWithFunds(w);
      } catch (e: any) {
        return res.status(400).json({ message: e?.message || "Wallet inválida" });
      }
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
      wallet: w || undefined,
    });

    return res.status(201).json(user);
  } catch (err) {
    console.error("Error register", err);
    return res.status(500).json({ message: "Error del servidor" });
  }
}

// =====================
// REGISTER INSTITUTION (AJUSTADO AL FORM + wallet)
// =====================
export async function registerInstitution(req: Request, res: Response) {
  try {
    if (!JWT_SECRET) {
      return res
        .status(500)
        .json({ message: "JWT_SECRET no está configurado en el servidor" });
    }

    // ✅ SOLO lo que manda el formulario + wallet
    const {
      name,
      description,
      country,
      website,
      email,
      password,
      emailDomains,
      type,
      wallet,
    } = req.body;

    const em = String(email ?? "").trim().toLowerCase();
    const nm = String(name ?? "").trim();
    const desc = String(description ?? "").trim();
    const ctry = String(country ?? "").trim();
    const pwd = String(password ?? "");
    const w = String(wallet ?? "").trim();

    // básicos requeridos (como tu form)
    if (!nm) return res.status(400).json({ message: "Institution name is required." });
    if (!desc) return res.status(400).json({ message: "Description is required." });
    if (!ctry) return res.status(400).json({ message: "Country is required." });
    if (!em) return res.status(400).json({ message: "Email is required." });

    const existing = await Institution.findOne({ email: em });
    if (existing) {
      return res.status(400).json({ message: "El email ya está registrado" });
    }

    if (!pwd || pwd.length < 8) {
      return res
        .status(400)
        .json({ message: "La contraseña debe tener al menos 8 caracteres" });
    }

    // ✅ Wallet obligatoria para institución (private key)
    if (!w) {
      return res.status(400).json({
        message: "La institución debe registrar una wallet (private key) obligatoria",
      });
    }

    // ✅ Validar private key + fondos
    try {
      await assertPrivateKeyWithFunds(w);
    } catch (e: any) {
      return res.status(400).json({ message: e?.message || "Wallet inválida" });
    }

    // emailDomains opcional (tu form manda string csv, ya lo conviertes en el frontend,
    // pero igual lo normalizamos por si llega como string)
    const domainsArr = Array.isArray(emailDomains)
      ? emailDomains.map((x: any) => String(x).trim()).filter(Boolean)
      : String(emailDomains ?? "")
          .split(",")
          .map((x) => x.trim())
          .filter(Boolean);

    const institution = await Institution.create({
      name: nm,
      description: desc,
      country: ctry,
      website: String(website ?? "").trim() || undefined,
      email: em,
      password: pwd,
      type: String(type ?? "UNIVERSITY").trim() || "UNIVERSITY",
      emailDomains: domainsArr.length ? domainsArr : [],
      wallet: w, // ✅ requerida
      // ❌ NO enviamos: logo, isMember, canVerify -> quedan defaults del modelo
    });

    return res.status(201).json(institution);
  } catch (err) {
    console.error("Error registerInstitution", err);
    return res.status(500).json({ message: "Error del servidor" });
  }
}

// =====================
// LOGIN
// =====================
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
      const isMatch = password === user.password;
      if (!isMatch) {
        return res.status(400).json({ message: "Credenciales inválidas" });
      }

      const payload: JwtPayload = {
        userId: user._id.toString(),
        type: "USER",
      };

      const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
      return res.json({ token, type: "USER", user });
    }

    const inst = await Institution.findOne({ email });
    if (inst) {
      const isMatch = password === inst.password;
      if (!isMatch) {
        return res.status(400).json({ message: "Credenciales inválidas" });
      }

      const payload: JwtPayload = {
        institutionId: inst._id.toString(),
        type: "INSTITUTION",
      };

      const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
      return res.json({ token, type: "INSTITUTION", institution: inst });
    }

    return res.status(400).json({ message: "Credenciales inválidas" });
  } catch (err) {
    console.error("Error login", err);
    return res.status(500).json({ message: "Error del servidor" });
  }
}