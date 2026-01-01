import { Request, Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { User } from "../models/user.model";

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

// Devuelve todos los usuarios (sin password) + imgUrl para renderizar imagen
export async function getAllUsers(_req: Request, res: Response) {
  const users = await User.find().select("-password"); // evita exponer password
  const mapped = users.map((u) => {
    const obj = u.toObject();
    return {
      ...obj,
      imgUrl: buildImgUrl(obj.img), // URL base64 lista para el frontend
      img: undefined, // evita mandar el buffer crudo por la API
    };
  });
  return res.json(mapped);
}

// Devuelve el usuario autenticado actual (perfil)
export async function getMe(req: AuthRequest, res: Response) {
  const u = req.user; // viene del middleware auth
  if (!u) return res.status(401).json({ message: "No autorizado" });

  const obj = u.toObject();
  return res.json({
    ...obj,
    imgUrl: buildImgUrl(obj.img), // imagen lista para mostrar
    img: undefined, // no enviar binario
  });
}

// ✅ Actualiza datos del usuario logueado
// Soporta multipart/form-data (campos + archivo de imagen)
export async function updateMe(req: AuthRequest, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ message: "No autorizado" });

    // Lista blanca de campos que SI se pueden actualizar
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

    // Copia solo los campos permitidos desde el body
    for (const key of allowedFields) {
      if (req.body[key] !== undefined) {
        updates[key] = req.body[key];
      }
    }

    // ✅ Si vienen arrays como string en FormData, los convertimos a JSON real
    const parsedEdu = safeJsonParse<unknown[]>(updates.educationalEmails);
    if (parsedEdu) updates.educationalEmails = parsedEdu;

    const parsedInst = safeJsonParse<string[]>(updates.institutions);
    if (parsedInst) updates.institutions = parsedInst;

    // Bandera para borrar imagen (acepta 1/true)
    const removeImg =
      String(req.body.removeImg || "").toLowerCase() === "1" ||
      String(req.body.removeImg || "").toLowerCase() === "true";

    // Si pidieron borrar imagen, la removemos del documento
    if (removeImg) {
      updates.img = undefined; // o null según tu esquema (aquí lo limpias)
    }

    // ✅ Si llega archivo, lo guardamos como binario en MongoDB
    if (req.file) {
      updates.img = {
        data: req.file.buffer, // buffer del archivo subido
        contentType: req.file.mimetype, // mime type (png/jpg/etc)
      };
    }

    // Actualiza al usuario y devuelve el documento actualizado
    const updated = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updates, ...(removeImg ? { $unset: { img: 1 } } : {}) }, // unset borra el campo img del documento
      { new: true } // devuelve el nuevo documento
    ).select("-password"); // nunca enviar password

    if (!updated) return res.status(404).json({ message: "Usuario no encontrado" });

    const obj = updated.toObject();
    return res.json({
      ...obj,
      imgUrl: buildImgUrl(obj.img), // genera la URL base64 para frontend
      img: undefined, // no enviar el buffer crudo
    });
  } catch (err) {
    console.error("Error updateMe", err);
    return res.status(500).json({ message: "Error del servidor" });
  }
}

// Devuelve las tesis a las que el usuario dio like (con populate)
export async function getMyLikedTheses(req: AuthRequest, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ message: "No autorizado" });

    // Trae el usuario con las tesis likeadas ya pobladas
    const user = await User.findById(req.user._id).populate("likedTheses");
    return res.json(user?.likedTheses ?? []);
  } catch (err) {
    console.error("Error getMyLikedTheses", err);
    return res.status(500).json({ message: "Error del servidor" });
  }
}
