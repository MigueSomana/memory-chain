import { Request, Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { User } from "../models/user.model";
import { Thesis } from "../models/thesis.model";

function buildImgUrl(img?: { data: Buffer; contentType: string }) {
  if (!img?.data || !img.contentType) return "";
  const b64 = img.data.toString("base64");
  return `data:${img.contentType};base64,${b64}`;
}

function safeJsonParse<T>(value: unknown): T | undefined {
  if (typeof value !== "string") return undefined;
  try {
    return JSON.parse(value) as T;
  } catch {
    return undefined;
  }
}

export async function getAllUsers(_req: Request, res: Response) {
  const users = await User.find().select("-password");
  const mapped = users.map((u) => {
    const obj = u.toObject();
    return {
      ...obj,
      imgUrl: buildImgUrl(obj.img),
      img: undefined, // evita mandar el buffer crudo
    };
  });
  return res.json(mapped);
}

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

// ✅ Ahora soporta multipart/form-data + img file
export async function updateMe(req: AuthRequest, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ message: "No autorizado" });

    // Campos permitidos
    const allowedFields = [
      "name",
      "lastname",
      "password",
      "email",
      "educationalEmails",
      "institutions",
      "removeImg",
    ] as const;

    const updates: Record<string, unknown> = {};

    for (const key of allowedFields) {
      if (req.body[key] !== undefined) {
        updates[key] = req.body[key];
      }
    }

    // ✅ Parsear arrays que vienen como string (FormData)
    const parsedEdu = safeJsonParse<unknown[]>(updates.educationalEmails);
    if (parsedEdu) updates.educationalEmails = parsedEdu;

    const parsedInst = safeJsonParse<string[]>(updates.institutions);
    if (parsedInst) updates.institutions = parsedInst;

    const removeImg =
      String(req.body.removeImg || "").toLowerCase() === "1" ||
      String(req.body.removeImg || "").toLowerCase() === "true";

    if (removeImg) {
      updates.img = undefined;              // o null, ver nota abajo
    }
    // ✅ Imagen binaria en Mongo (User.img.data)
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
