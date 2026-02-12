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
export const getAllInstitutions = async (_req: Request, res: Response) => {
  try {
    const institutions = await Institution.find().select("-password");
    const mapped = institutions.map((inst) => {
      const obj: any = inst.toObject();
      return {
        ...obj,
        logoUrl: buildLogoUrl(obj.logo),
        logo: undefined,
      };
    });
    res.json(mapped);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching institutions" });
  }
};

// GET /api/institutions/:id
export const getInstitutionById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const institution = await Institution.findById(id).select("-password");
    if (!institution) {
      return res.status(404).json({ message: "Institution not found" });
    }

    const obj: any = institution.toObject();
    return res.json({
      ...obj,
      logoUrl: buildLogoUrl(obj.logo),
      logo: undefined,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching institution" });
  }
};

// PUT /api/institutions/:id
export const updateInstitution = async (req: AuthRequest, res: Response) => {
  try {
    const { id: institutionId } = req.params;

    if (!req.institution && !req.user) {
      return res.status(401).json({ message: "No autenticado" });
    }

    if (req.institution) {
      if (req.institution._id.toString() !== institutionId) {
        return res
          .status(403)
          .json({ message: "No puedes modificar esta institución" });
      }
    } else if (req.user) {
      const isMember = (req.user.institutions ?? []).some(
        (instId) => instId.toString() === institutionId
      );
      if (!isMember) {
        return res
          .status(403)
          .json({ message: "No puedes modificar esta institución" });
      }
    }

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
      "wallet", // ✅ nuevo
      "removeImg",
    ] as const;

    const updates: Record<string, any> = {};
    for (const key of allowedFields) {
      if (req.body[key] !== undefined) {
        updates[key] = req.body[key];
      }
    }

    const parsedDepts = safeJsonParse<string[]>(updates.departments);
    if (parsedDepts) updates.departments = parsedDepts;

    const parsedDomains = safeJsonParse<string[]>(updates.emailDomains);
    if (parsedDomains) updates.emailDomains = parsedDomains;

    if (updates.name) updates.name = String(updates.name).trim();
    if (updates.country) updates.country = String(updates.country).trim();
    if (updates.email) updates.email = String(updates.email).trim().toLowerCase();
    if (updates.website) updates.website = String(updates.website).trim();
    if (updates.wallet !== undefined) updates.wallet = String(updates.wallet).trim();

    const removeImg =
      String(req.body.removeImg || "").toLowerCase() === "1" ||
      String(req.body.removeImg || "").toLowerCase() === "true";

    if (removeImg) {
      updates.logo = undefined;
    }

    if (req.file) {
      updates.logo = {
        data: req.file.buffer,
        contentType: req.file.mimetype,
      };
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: "No hay campos para actualizar" });
    }

    const updated = await Institution.findByIdAndUpdate(
      institutionId,
      { $set: updates, ...(removeImg ? { $unset: { logo: 1 } } : {}) },
      { new: true, runValidators: true }
    ).select("-password");

    if (!updated) {
      return res.status(404).json({ message: "Institution not found" });
    }

    const obj: any = updated.toObject();
    return res.json({
      ...obj,
      logoUrl: buildLogoUrl(obj.logo),
      logo: undefined,
    });
  } catch (err: any) {
    console.error("Error updating institution profile:", err);
    return res.status(500).json({
      message: "Error updating institution profile",
      error: err.message,
    });
  }
};

// GET /api/institutions/:id/students
export const getInstitutionStudents = async (req: Request, res: Response) => {
  try {
    const { id: institutionId } = req.params;
    const students = await User.find({ institutions: institutionId }).select(
      "-password"
    );
    res.json(students);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching students" });
  }
};

// GET /api/institutions/:id/theses
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

/**
 * ✅ NUEVO:
 * Una institución aprueba/rechaza a un estudiante para SU institución
 * - Requiere auth como INSTITUTION
 * - Actualiza user.educationalEmails[].status para esa institución
 *
 * Body:
 * {
 *   userId: string,
 *   status: "PENDING" | "APPROVED" | "REJECTED",
 *   email?: string,              // opcional: actualizar/guardar correo
 *   institutionKey?: string      // opcional: si en tu array guardas un string específico
 * }
 */
export const setStudentInstitutionStatus = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.institution) {
      return res.status(401).json({ message: "No autorizado (institución)" });
    }

    const { id: institutionId } = req.params;

    // Solo puede gestionar su propia institución
    if (req.institution._id.toString() !== institutionId) {
      return res.status(403).json({ message: "No puedes gestionar esta institución" });
    }

    const { userId, status, email, institutionKey } = req.body as {
      userId: string;
      status: "PENDING" | "APPROVED" | "REJECTED";
      email?: string;
      institutionKey?: string;
    };

    if (!userId) return res.status(400).json({ message: "userId requerido" });
    if (!["PENDING", "APPROVED", "REJECTED"].includes(status)) {
      return res.status(400).json({ message: "status inválido" });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "Usuario no encontrado" });

    // Cómo identificas la institución dentro del array:
    // - por institutionKey (si tu frontend lo manda)
    // - o por nombre de institución
    // - o por institutionId en string (si decides guardar _id como string)
    const keyCandidates = [
      institutionKey?.trim(),
      req.institution.name?.trim(),
      req.institution._id.toString(),
    ].filter(Boolean) as string[];

    user.educationalEmails = user.educationalEmails || [];

    const idx = user.educationalEmails.findIndex((e) =>
      keyCandidates.includes(String(e.institution || "").trim())
    );

    if (idx >= 0) {
      user.educationalEmails[idx].status = status;
      if (email !== undefined) {
        user.educationalEmails[idx].email = String(email).trim();
      }
    } else {
      // si no existe entrada, la creamos (útil para “aprobar solicitud”)
      user.educationalEmails.push({
        institution: keyCandidates[0] || req.institution._id.toString(),
        email: email ? String(email).trim() : undefined,
        status,
      });
    }

    await user.save();
    return res.json({ message: "Estado actualizado", educationalEmails: user.educationalEmails });
  } catch (err) {
    console.error("Error setStudentInstitutionStatus", err);
    return res.status(500).json({ message: "Error del servidor" });
  }
};