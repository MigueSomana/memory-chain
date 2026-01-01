import { Request, Response } from "express";
import { Institution } from "../models/institution.model";
import { User } from "../models/user.model";
import { Thesis } from "../models/thesis.model";
import { AuthRequest } from "../middleware/auth";

// Convierte el logo binario a una URL base64 para mostrarlo en el frontend
function buildLogoUrl(logo?: { data: Buffer; contentType: string }) {
  if (!logo?.data || !logo.contentType) return "";
  const b64 = logo.data.toString("base64");
  return `data:${logo.contentType};base64,${b64}`;
}

// Parsea JSON solo si viene como string (útil cuando se usa FormData)
function safeJsonParse<T>(value: unknown): T | undefined {
  if (typeof value !== "string") return undefined;
  try {
    return JSON.parse(value) as T;
  } catch {
    return undefined;
  }
}

// GET /api/institutions
// Lista instituciones (sin password) y agrega logoUrl para el frontend
export const getAllInstitutions = async (_req: Request, res: Response) => {
  try {
    const institutions = await Institution.find().select("-password"); // evita exponer password
    const mapped = institutions.map((inst) => {
      const obj: any = inst.toObject();
      return {
        ...obj,
        logoUrl: buildLogoUrl(obj.logo), // URL lista para renderizar
        logo: undefined, // no mandes el buffer crudo por la API
      };
    });
    res.json(mapped);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching institutions" });
  }
};

// GET /api/institutions/:id
// Obtiene una institución por ID (sin password) + logoUrl
export const getInstitutionById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const institution = await Institution.findById(id).select("-password"); // no exponer password
    if (!institution) {
      return res.status(404).json({ message: "Institution not found" });
    }

    const obj: any = institution.toObject();
    return res.json({
      ...obj,
      logoUrl: buildLogoUrl(obj.logo), // URL base64 para mostrar logo
      logo: undefined, // no enviar binario
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching institution" });
  }
};

// PUT /api/institutions/:id  (multipart: logo + fields)
// Actualiza perfil institucional (con control de permisos)
export const updateInstitution = async (req: AuthRequest, res: Response) => {
  try {
    const { id: institutionId } = req.params;

    // --------- PERMISOS ---------
    // Debe venir autenticado como institución o como usuario asociado
    if (!req.institution && !req.user) {
      return res.status(401).json({ message: "No autenticado" });
    }

    // Si es institución: solo puede editarse a sí misma
    if (req.institution) {
      if (req.institution._id.toString() !== institutionId) {
        return res.status(403).json({ message: "No puedes modificar esta institución" });
      }
    } else if (req.user) {
      // Si es usuario: debe estar asociado a esa institución
      const isMember = (req.user.institutions ?? []).some(
        (instId) => instId.toString() === institutionId
      );
      if (!isMember) {
        return res.status(403).json({ message: "No puedes modificar esta institución" });
      }
    }

    // --------- CAMPOS PERMITIDOS ---------
    // Lista blanca para evitar updates peligrosos/innecesarios
    const allowedFields = [
      "name",
      "description",
      "country",
      "website",
      "email",
      "password",
      "departments",
      "emailDomains",
      "type",
      "isMember",
      "canVerify",
      "removeImg",
    ] as const;

    const updates: Record<string, any> = {};
    for (const key of allowedFields) {
      if (req.body[key] !== undefined) {
        updates[key] = req.body[key];
      }
    }

    // ✅ Parsear arrays si vienen como string (FormData)
    const parsedDepts = safeJsonParse<string[]>(updates.departments);
    if (parsedDepts) updates.departments = parsedDepts;

    const parsedDomains = safeJsonParse<string[]>(updates.emailDomains);
    if (parsedDomains) updates.emailDomains = parsedDomains;

    // Normalizaciones básicas para guardar limpio
    if (updates.name) updates.name = String(updates.name).trim();
    if (updates.country) updates.country = String(updates.country).trim();
    if (updates.email) updates.email = String(updates.email).trim().toLowerCase();
    if (updates.website) updates.website = String(updates.website).trim();

    // Bandera para borrar el logo (acepta 1/true)
    const removeImg =
      String(req.body.removeImg || "").toLowerCase() === "1" ||
      String(req.body.removeImg || "").toLowerCase() === "true";

    // Si pidieron borrar el logo, se limpia del documento
    if (removeImg) {
      updates.logo = undefined;              // o null según tu manejo
    }

    // ✅ Si llega archivo (logo), se guarda como binario en MongoDB
    if (req.file) {
      updates.logo = {
        data: req.file.buffer, // buffer del archivo subido
        contentType: req.file.mimetype, // tipo de imagen (png/jpg/etc)
      };
    }

    // Si no hay nada que actualizar, corta aquí
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: "No hay campos para actualizar" });
    }

    // Actualiza institución, valida campos y devuelve el doc actualizado
    const updated = await Institution.findByIdAndUpdate(
      institutionId,
      { $set: updates, ...(removeImg ? { $unset: { logo: 1 } } : {}) }, // unset elimina el campo
      { new: true, runValidators: true } // devuelve el nuevo doc y valida schema
    ).select("-password"); // nunca exponer password

    if (!updated) {
      return res.status(404).json({ message: "Institution not found" });
    }

    const obj: any = updated.toObject();
    return res.json({
      ...obj,
      logoUrl: buildLogoUrl(obj.logo), // URL base64 para frontend
      logo: undefined, // no enviar binario
    });
  } catch (err: any) {
    console.error("Error updating institution profile:", err);
    return res.status(500).json({
      message: "Error updating institution profile",
      error: err.message,
    });
  }
};

// ... students/theses quedan igual
// Devuelve los usuarios asociados a una institución (sin password)
export const getInstitutionStudents = async (req: Request, res: Response) => {
  try {
    const { id: institutionId } = req.params;
    const students = await User.find({ institutions: institutionId }).select("-password"); // no exponer password
    res.json(students);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching students" });
  }
};

// Devuelve las tesis asociadas a una institución + datos básicos del uploader
export const getInstitutionTheses = async (req: Request, res: Response) => {
  try {
    const { id: institutionId } = req.params;
    const theses = await Thesis.find({ institution: institutionId }).populate(
      "uploadedBy",
      "name lastname email"
    );
    res.json(theses);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching theses" });
  }
};
