// src/controllers/institution.controller.ts
import { Request, Response } from "express";
import { Institution } from "../models/institution.model";
import { User } from "../models/user.model";
import { Thesis } from "../models/thesis.model";
import { AuthRequest } from "../middleware/auth";

// GET /api/institutions
export const getAllInstitutions = async (_req: Request, res: Response) => {
  try {
    const institutions = await Institution.find().select("-password");
    res.json(institutions);
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
    res.json(institution);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching institution" });
  }
};

// PUT/PATCH /api/institutions/:id
export const updateInstitution = async (req: AuthRequest, res: Response) => {
  try {
    const { id: institutionId } = req.params;

    // --------- PERMISOS ---------
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

    // --------- CAMPOS PERMITIDOS ---------
    const allowedFields = [
      "name",
      "description",
      "country",
      "website",
      "email",
      "password",
      "departments",
      "emailDomains",
      "logo",
      "type",
      "isMember",
    ];

    const updates: any = {};

    for (const key of allowedFields) {
      if (req.body[key] !== undefined) {
        updates[key] = req.body[key];
      }
    }

    // Normalizaciones básicas
    if (updates.name) {
      updates.name = String(updates.name).trim();
    }

    if (updates.country) {
      updates.country = String(updates.country).trim();
    }

    if (updates.email) {
      updates.email = String(updates.email).trim().toLowerCase();
    }

    if (updates.website) {
      updates.website = String(updates.website).trim();
    }

    // Departments: aseguramos que sea array de strings
    if (Array.isArray(updates.departments)) {
      updates.departments = updates.departments.map((d: any) =>
        typeof d === "string" ? d : d?.name
      );
    }

    // Email domains: array de strings
    if (Array.isArray(updates.emailDomains)) {
      updates.emailDomains = updates.emailDomains.map((d: any) =>
        String(d)
      );
    }

    // Logo: normalmente ya viene como string (base64 / URL)
    if (updates.logo === "") {
      // si quieres permitir borrar logo, aquí podrías poner null, por ejemplo
      updates.logo = "";
    }

    // Si no hay nada que actualizar
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: "No hay campos para actualizar" });
    }

    const updated = await Institution.findByIdAndUpdate(
      institutionId,
      { $set: updates },
      {
        new: true,
        runValidators: true, // muy recomendable para respetar el schema
      }
    ).select("-password");

    if (!updated) {
      return res.status(404).json({ message: "Institution not found" });
    }

    return res.json(updated);
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

    const students = await User.find({
      institutions: institutionId,
    }).select("-password");

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

    const theses = await Thesis.find({
      institution: institutionId,
    }).populate("uploadedBy", "name lastname email");

    res.json(theses);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching theses" });
  }
};
