import { Request, Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { User } from "../models/user.model";
import mongoose from "mongoose";

// Convierte la imagen binaria (Buffer) a una URL base64 para el frontend
function buildImgUrl(img?: { data: Buffer; contentType: string }) {
  if (!img?.data || !img.contentType) return "";
  const b64 = img.data.toString("base64");
  return `data:${img.contentType};base64,${b64}`;
}

// Parsea JSON solo si viene como string (útil con multipart/form-data)
function safeJsonParse<T>(value: unknown): T | undefined {
  if (typeof value !== "string") return undefined;
  try {
    return JSON.parse(value) as T;
  } catch {
    return undefined;
  }
}

// Devuelve todos los usuarios (sin password) + imgUrl
export async function getAllUsers(_req: Request, res: Response) {
  const users = await User.find().select("-password");
  const mapped = users.map((u) => {
    const obj = u.toObject();
    return {
      ...obj,
      imgUrl: buildImgUrl(obj.img),
      img: undefined,
    };
  });
  return res.json(mapped);
}

// Devuelve el usuario autenticado actual (perfil)
export async function getMe(req: AuthRequest, res: Response) {
  const u = req.user;
  if (!u) return res.status(401).json({ message: "No autorizado" });

  const obj = u.toObject();
  return res.json({
    ...obj,
    imgUrl: buildImgUrl(obj.img),
    img: undefined,
  });
}

export async function getUserBasicById(req: Request, res: Response) {
  try {
    const { id } = req.params;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID de usuario inválido" });
    }

    const user = await User.findById(id).select("name lastname");

    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    return res.json({
      _id: user._id,
      name: user.name,
      lastname: user.lastname,
    });
  } catch (err) {
    console.error("Error getUserBasicById", err);
    return res.status(500).json({ message: "Error del servidor" });
  }
}

// Actualiza datos del usuario logueado
export async function updateMe(req: AuthRequest, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ message: "No autorizado" });

    const allowedFields = [
      "name",
      "lastname",
      "password",
      "email",
      "educationalEmails",
      "institutions",
      "wallet",     // ✅ nuevo
      "removeImg",
    ] as const;

    const updates: Record<string, unknown> = {};

    for (const key of allowedFields) {
      if (req.body[key] !== undefined) {
        updates[key] = req.body[key];
      }
    }

    const parsedEdu = safeJsonParse<unknown[]>(updates.educationalEmails);
    if (parsedEdu) updates.educationalEmails = parsedEdu;

    const parsedInst = safeJsonParse<string[]>(updates.institutions);
    if (parsedInst) updates.institutions = parsedInst;

    if (updates.wallet !== undefined) {
      updates.wallet = String(updates.wallet).trim();
    }

    const removeImg =
      String(req.body.removeImg || "").toLowerCase() === "1" ||
      String(req.body.removeImg || "").toLowerCase() === "true";

    if (removeImg) {
      updates.img = undefined;
    }

    if (req.file) {
      updates.img = {
        data: req.file.buffer,
        contentType: req.file.mimetype,
      };
    }

    const updated = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updates, ...(removeImg ? { $unset: { img: 1 } } : {}) },
      { new: true }
    ).select("-password");

    if (!updated) return res.status(404).json({ message: "Usuario no encontrado" });

    const obj = updated.toObject();
    return res.json({
      ...obj,
      imgUrl: buildImgUrl(obj.img),
      img: undefined,
    });
  } catch (err) {
    console.error("Error updateMe", err);
    return res.status(500).json({ message: "Error del servidor" });
  }
}
export async function setUserEducationalStatus(req: AuthRequest, res: Response) {
  try {
    // ✅ acepta USER o INSTITUTION (igual que setThesisStatus)
    if (!req.user && !req.institution) {
      return res.status(401).json({ message: "No autorizado" });
    }

    const { id } = req.params; // userId a modificar
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID de usuario inválido" });
    }

    const institutionId = String(req.body?.institutionId ?? "").trim();
    const statusRaw = String(req.body?.status ?? "").trim().toUpperCase();

    if (!institutionId) {
      return res.status(400).json({ message: "institutionId es requerido" });
    }
    if (!["PENDING", "APPROVED", "REJECTED"].includes(statusRaw)) {
      return res.status(400).json({ message: "Status inválido" });
    }

    // ✅ permisos: o viene institution token y coincide con institutionId,
    // o viene user token y el user es miembro de esa institution
    let canManage = false;

    if (req.institution) {
      if (String(req.institution._id) === String(institutionId)) canManage = true;
    }

    if (!canManage && req.user?.institutions) {
      const isMember = req.user.institutions.some(
        (instId) => String(instId) === String(institutionId),
      );
      if (isMember) canManage = true;
    }

    if (!canManage) {
      return res
        .status(403)
        .json({ message: "No autorizado para gestionar esta institución" });
    }

    const target = await User.findById(id);
    if (!target) return res.status(404).json({ message: "Usuario no encontrado" });

    const eduArr = Array.isArray(target.educationalEmails)
      ? target.educationalEmails
      : [];

    // Busca entry por institution (en tu modelo es string)
    const idx = eduArr.findIndex((e: any) => {
      const inst = String(e?.institution ?? "").trim();
      return inst === String(institutionId);
    });

    if (idx >= 0) {
      // ✅ compatibilidad modelo viejo: si no hay status, lo agregamos
      const prev: any = eduArr[idx] || {};
      eduArr[idx] = {
        institution: String(prev?.institution ?? institutionId),
        email: prev?.email ? String(prev.email) : undefined,
        status: statusRaw,
      } as any;
    } else {
      // si no existe, lo creamos
      eduArr.push({
        institution: institutionId,
        email: undefined,
        status: statusRaw,
      } as any);
    }

    target.educationalEmails = eduArr as any;
    await target.save();

    const obj = target.toObject();

    return res.json({
      updated: { institution: institutionId, status: statusRaw },
      user: {
        ...obj,
        imgUrl: buildImgUrl(obj.img),
        img: undefined,
      },
    });
  } catch (err) {
    console.error("Error setUserEducationalStatus", err);
    return res.status(500).json({ message: "Error del servidor" });
  }
}
// Devuelve las tesis a las que el usuario dio like (con populate)
export async function getMyLikedTheses(req: AuthRequest, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ message: "No autorizado" });

    const user = await User.findById(req.user._id).populate("likedTheses");
    return res.json(user?.likedTheses ?? []);
  } catch (err) {
    console.error("Error getMyLikedTheses", err);
    return res.status(500).json({ message: "Error del servidor" });
  }
}