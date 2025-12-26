import { Request, Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { Thesis } from "../models/thesis.model";
import { CertificationStatus } from "../models/types";
import { User } from "../models/user.model";
import { uploadPdfBufferToPinata } from "../services/pinata.service";
import { certifyOnChain } from "../services/blockchain.service";

// helpers tipados
type AnyRecord = Record<string, unknown>;

function parseMaybeJson<T>(v: unknown, fallback: T): T {
  if (typeof v === "string") {
    try {
      return JSON.parse(v) as T;
    } catch {
      return fallback;
    }
  }
  return (v as T) ?? fallback;
}

type AuthorDTO = { name: string; lastname: string; email?: string };

function isAuthorDTO(x: unknown): x is AuthorDTO {
  if (!x || typeof x !== "object") return false;
  const o = x as AnyRecord;
  return typeof o.name === "string" && typeof o.lastname === "string";
}

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

    if (!thesis)
      return res.status(404).json({ message: "Tesis no encontrada" });
    return res.json(thesis);
  } catch (err) {
    console.error("Error getThesisById", err);
    return res.status(500).json({ message: "Error del servidor" });
  }
}

// ✅ Crear tesis: requiere PDF
export async function createThesis(req: AuthRequest, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ message: "No autorizado" });
    if (!req.file) {
      return res.status(400).json({ message: "Archivo PDF requerido" });
    }

    const body = req.body?.data
      ? parseMaybeJson<AnyRecord>(req.body.data, {})
      : (req.body as AnyRecord);

    const title = String(body.title ?? "").trim();
    const summary = String(body.summary ?? "").trim();
    const language = String(body.language ?? "").trim();
    const degree = String(body.degree ?? "").trim();
    const field =
      typeof body.field === "string" ? body.field.trim() : undefined;
    const department =
      typeof body.department === "string" ? body.department.trim() : undefined;
    const doi = typeof body.doi === "string" ? body.doi.trim() : undefined;
    const year = typeof body.year === "number" ? body.year : Number(body.year);

    const institution = body.institution;

    const authors = parseMaybeJson<unknown[]>(body.authors, []);
    const tutors = parseMaybeJson<unknown[]>(body.tutors, []);
    const keywords = parseMaybeJson<string[]>(body.keywords, []);

    const parsedAuthors: AuthorDTO[] = authors.filter(isAuthorDTO);
    const parsedTutors: AuthorDTO[] = tutors.filter(isAuthorDTO);

    const { cid, fileHash } = await uploadPdfBufferToPinata(
      req.file.buffer,
      req.file.originalname
    );

    const thesis = await Thesis.create({
      title,
      authors: parsedAuthors,
      tutors: parsedTutors,
      summary,
      keywords,
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
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error al crear tesis";
    console.error("❌ ERROR createThesis:", err);
    return res
      .status(500)
      .json({ message: "Error al crear tesis", error: message });
  }
}

/**
 * ✅ UPDATE: ahora soporta actualizar PDF/IPFS también.
 *
 * IMPORTANTE:
 * Para que req.file exista aquí, tu router debe ser:
 *   router.patch("/:id", authMiddleware, uploadPdf.single("pdf"), updateThesis);
 *
 * Si NO pones multer en PATCH, req.file siempre será undefined.
 */
export async function updateThesis(req: AuthRequest, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ message: "No autorizado" });

    const { id } = req.params;
    const thesis = await Thesis.findById(id);
    if (!thesis)
      return res.status(404).json({ message: "Tesis no encontrada" });

    if (thesis.uploadedBy?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "No puedes editar esta tesis" });
    }

    // ✅ soporta JSON normal o multipart con "data"
    const body: AnyRecord = req.body?.data
      ? parseMaybeJson<AnyRecord>(req.body.data, {})
      : (req.body as AnyRecord);

    const allowedFields = [
      "title",
      "authors",
      "tutors",
      "summary",
      "keywords",
      "language",
      "degree",
      "field",
      "year",
      "department",
      "doi",
      // NO permitimos status directo desde el estudiante
    ] as const;

    const updates: Record<string, unknown> = {};
    for (const key of allowedFields) {
      if (body[key] !== undefined) {
        updates[key] = body[key];
      }
    }

    // parse arrays si vienen string (multipart)
    if (typeof updates.authors === "string")
      updates.authors = JSON.parse(updates.authors);
    if (typeof updates.tutors === "string")
      updates.tutors = JSON.parse(updates.tutors);
    if (typeof updates.keywords === "string")
      updates.keywords = JSON.parse(updates.keywords);

    // filtrar authors/tutors tipados por seguridad
    if (Array.isArray(updates.authors)) {
      updates.authors = (updates.authors as unknown[]).filter(isAuthorDTO);
    }
    if (Array.isArray(updates.tutors)) {
      updates.tutors = (updates.tutors as unknown[]).filter(isAuthorDTO);
    }

    // ✅ si hay pdf nuevo -> re-subir a pinata y actualizar campos
    if (req.file) {
      const { cid, fileHash } = await uploadPdfBufferToPinata(
        req.file.buffer,
        req.file.originalname
      );

      updates.ipfsCid = cid;
      updates.fileHash = fileHash;
      updates.hashAlgorithm = "sha256";
    }

    // ✅ cualquier edición resetea a PENDING
    updates.status = "PENDING";

    const updated = await Thesis.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true }
    )
      .populate("uploadedBy", "name lastname email")
      .populate("institution", "name");

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
    if (!thesis)
      return res.status(404).json({ message: "Tesis no encontrada" });

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

    if (!["PENDING", "APPROVED", "REJECTED"].includes(status)) {
      return res.status(400).json({ message: "Status inválido" });
    }

    thesis.status = status;
    if (status === "APPROVED") {
      // evita doble certificación
      if (!thesis.txHash) {
        if (!thesis.uploadedBy) {
          return res
            .status(400)
            .json({ message: "Tesis sin uploadedBy, no se puede certificar" });
        }

        const onchain = await certifyOnChain({
          thesisId: thesis._id.toString(),
          userId: thesis.uploadedBy.toString(),
          institutionId: thesis.institution.toString(),
          ipfsCid: thesis.ipfsCid,
          fileHash: thesis.fileHash,
          hashAlgorithm: thesis.hashAlgorithm,
        });

        thesis.txHash = onchain.txHash;
        thesis.chainId = onchain.chainId;
        thesis.blockNumber = onchain.blockNumber;
      }
    }

    await thesis.save();

    return res.json(thesis);
  } catch (err) {
    console.error("Error setThesisStatus", err);
    return res.status(500).json({ message: "Error del servidor" });
  }
}

// Like / Unlike
export async function toggleLikeThesis(req: AuthRequest, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ message: "No autorizado" });

    const { id } = req.params;

    const thesis = await Thesis.findById(id);
    if (!thesis)
      return res.status(404).json({ message: "Tesis no encontrada" });

    const user = await User.findById(req.user._id);
    if (!user)
      return res.status(401).json({ message: "Usuario no encontrado" });

    const userIdStr = req.user._id.toString();

    const alreadyLikedUser = user.likedTheses.some(
      (tId) => tId.toString() === id
    );
    const alreadyLikedThesis =
      Array.isArray(thesis.likedBy) &&
      thesis.likedBy.some((uId) => uId.toString() === userIdStr);

    const alreadyLiked = alreadyLikedUser || alreadyLikedThesis;

    if (alreadyLiked) {
      user.likedTheses = user.likedTheses.filter(
        (tId) => tId.toString() !== id
      );
      thesis.likedBy = (thesis.likedBy || []).filter(
        (uId) => uId.toString() !== userIdStr
      );
      thesis.likes = Math.max((thesis.likes || 0) - 1, 0);
    } else {
      user.likedTheses.push(thesis._id);
      thesis.likedBy = thesis.likedBy || [];
      if (!thesis.likedBy.some((uId) => uId.toString() === userIdStr)) {
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
