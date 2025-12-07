import { Request, Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { Thesis } from "../models/thesis.model";
import { uploadBufferToStoracha } from "../services/storacha.service";
import { CertificationStatus } from "../models/types";
import { User } from "../models/user.model";

// GET /theses?sortBy=title|createdAt|likes&order=asc|desc
export async function getAllTheses(req: Request, res: Response) {
  try {
    const { sortBy = "createdAt", order = "desc" } = req.query;

    const sortField =
      sortBy === "title" || sortBy === "likes" ? String(sortBy) : "createdAt";
    const sortOrder = order === "asc" ? 1 : -1;

    const theses = await Thesis.find()
      .populate("uploadedBy", "name lastname email")
      .populate("institution", "name")
      .sort({ [sortField]: sortOrder });

    return res.json(theses);
  } catch (err) {
    console.error("Error getAllTheses", err);
    return res.status(500).json({ message: "Error del servidor" });
  }
}

// GET /theses/institution/:idInstitution
export async function getThesesByInstitutionId(req: Request, res: Response) {
  try {
    const { idInstitution } = req.params;

    // Validar ObjectId
    if (!idInstitution || !idInstitution.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: "ID de institución inválido" });
    }

    const theses = await Thesis.find({ institution: idInstitution })
      .populate("uploadedBy", "name lastname email")
      .populate("institution", "name type country");

    return res.json(theses);
  } catch (err) {
    console.error("Error getThesesByInstitutionId:", err);
    return res.status(500).json({ message: "Error del servidor" });
  }
}

export async function getThesisById(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const thesis = await Thesis.findById(id)
      .populate("uploadedBy", "name lastname email")
      .populate("institution", "name");

    if (!thesis) {
      return res.status(404).json({ message: "Tesis no encontrada" });
    }
    return res.json(thesis);
  } catch (err) {
    console.error("Error getThesisById", err);
    return res.status(500).json({ message: "Error del servidor" });
  }
}

// Crear tesis: campos + archivo (multer)
export async function createThesis(req: AuthRequest, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ message: "No autorizado" });
    if (!req.file) {
      return res.status(400).json({ message: "Archivo PDF requerido" });
    }

    // ✅ Acepta si viene plano o dentro de "data"
    const body = req.body.data ? JSON.parse(req.body.data) : req.body;

    const {
      title,
      authors,
      advisors,
      summary,
      keywords,
      language,
      degree,
      field,
      year,
      institution,
      department,
      doi,
    } = body;

    const { cid, fileHash } = await uploadBufferToStoracha(
      req.file.buffer,
      req.file.originalname
    );

    const parsedAuthors = typeof authors === "string" ? JSON.parse(authors) : authors;
    const parsedAdvisors = typeof advisors === "string" ? JSON.parse(advisors) : advisors;
    const parsedKeywords = typeof keywords === "string" ? JSON.parse(keywords) : keywords;

    const thesis = await Thesis.create({
      title,
      authors: parsedAuthors,
      advisors: parsedAdvisors,
      summary,
      keywords: parsedKeywords,
      language,
      degree,
      field,
      year,
      institution,
      department,
      doi,
      uploadedBy: req.user._id,
      fileHash,
      hashAlgorithm: "sha256",
      ipfsCid: cid,
      status: "PENDING",
    });

    return res.status(201).json(thesis);
  } catch (err: any) {
    console.error("❌ ERROR createThesis:", err);
    return res.status(500).json({
      message: "Error al crear tesis",
      error: err.message,
    });
  }
}

// Estudiante edita su propia tesis (no puede tocar hash ni status)
export async function updateThesis(req: AuthRequest, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ message: "No autorizado" });

    const { id } = req.params;
    const thesis = await Thesis.findById(id);
    if (!thesis) {
      return res.status(404).json({ message: "Tesis no encontrada" });
    }

    if (thesis.uploadedBy?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "No puedes editar esta tesis" });
    }

    const allowedFields = [
      "title",
      "authors",
      "advisors",
      "summary",
      "keywords",
      "language",
      "degree",
      "field",
      "year",
      "department",
      "doi",
    ];

    const updates: Record<string, unknown> = {};
    for (const key of allowedFields) {
      if (req.body[key] !== undefined) {
        updates[key] = req.body[key];
      }
    }

    if (updates["authors"] && typeof updates["authors"] === "string") {
      updates["authors"] = JSON.parse(updates["authors"] as string);
    }
    if (updates["advisors"] && typeof updates["advisors"] === "string") {
      updates["advisors"] = JSON.parse(updates["advisors"] as string);
    }
    if (updates["keywords"] && typeof updates["keywords"] === "string") {
      updates["keywords"] = JSON.parse(updates["keywords"] as string);
    }

    const updated = await Thesis.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true }
    );

    return res.json(updated);
  } catch (err) {
    console.error("Error updateThesis", err);
    return res.status(500).json({ message: "Error del servidor" });
  }
}

// Institución marca como aprobada o no
export async function setThesisStatus(req: AuthRequest, res: Response) {
  try {
    if (!req.user && !req.institution) {
      return res.status(401).json({ message: "No autorizado" });
    }

    const { id } = req.params;
    const { status } = req.body as { status: CertificationStatus };

    const thesis = await Thesis.findById(id);
    if (!thesis) {
      return res.status(404).json({ message: "Tesis no encontrada" });
    }

    // validar que el actor (usuario o institución) pertenece a la institución de la tesis
    let canCertify = false;

    if (req.user?.institutions) {
      const isMember = req.user.institutions.some(
        (instId) => instId.toString() === thesis.institution.toString()
      );
      if (isMember) canCertify = true;
    }

    if (req.institution) {
      if (req.institution._id.toString() === thesis.institution.toString()) {
        canCertify = true;
      }
    }

    if (!canCertify) {
      return res
        .status(403)
        .json({ message: "No puedes certificar esta tesis" });
    }

    if (!Object.values(CertificationStatus).includes(status)) {
      return res.status(400).json({ message: "Status inválido" });
    }

    thesis.status = status;
    await thesis.save();

    return res.json(thesis);
  } catch (err) {
    console.error("Error setThesisStatus", err);
    return res.status(500).json({ message: "Error del servidor" });
  }
}

// Like / Unlike tesis
export async function toggleLikeThesis(req: AuthRequest, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ message: "No autorizado" });

    const { id } = req.params;

    const thesis = await Thesis.findById(id);
    if (!thesis) {
      return res.status(404).json({ message: "Tesis no encontrada" });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(401).json({ message: "Usuario no encontrado" });
    }

    const userIdStr = req.user._id.toString();

    // ¿ya dio like según el usuario?
    const alreadyLikedUser = user.likedTheses.some(
      (tId) => tId.toString() === id
    );

    // ¿ya aparece en likedBy de la tesis?
    const alreadyLikedThesis =
      Array.isArray(thesis.likedBy) &&
      thesis.likedBy.some((uId) => uId.toString() === userIdStr);

    const alreadyLiked = alreadyLikedUser || alreadyLikedThesis;

    if (alreadyLiked) {
      // quitar like en el usuario
      user.likedTheses = user.likedTheses.filter(
        (tId) => tId.toString() !== id
      );

      // quitar like en la tesis
      thesis.likedBy = (thesis.likedBy || []).filter(
        (uId) => uId.toString() !== userIdStr
      );

      thesis.likes = Math.max((thesis.likes || 0) - 1, 0);
    } else {
      // agregar like en el usuario
      user.likedTheses.push(thesis._id);

      // agregar like en la tesis
      thesis.likedBy = thesis.likedBy || [];
      if (
        !thesis.likedBy.some((uId) => uId.toString() === userIdStr)
      ) {
        thesis.likedBy.push(req.user._id);
      }

      thesis.likes = (thesis.likes || 0) + 1;
    }

    await user.save();
    await thesis.save();

    return res.json({ thesis, liked: !alreadyLiked });
  } catch (err) {
    console.error("Error toggleLikeThesis", err);
    return res.status(500).json({ message: "Error del servidor" });
  }
}
