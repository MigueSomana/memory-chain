import { Request, Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { Thesis } from "../models/thesis.model";
import { CertificationStatus } from "../models/types";
import { User } from "../models/user.model";
import { uploadPdfBufferToPinata } from "../services/pinata.service";
import { certifyOnChain } from "../services/blockchain.service";
import mongoose, { Types } from "mongoose";

// Helpers tipados para evitar any
type AnyRecord = Record<string, unknown>;

// Parsea JSON si viene como string (común en multipart/form-data), si falla usa fallback
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

// Normaliza string (trim) y retorna undefined si queda vacío
function toOptionalTrimmedString(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const s = v.trim();
  return s.length ? s : undefined;
}

function toRequiredTrimmedString(v: unknown): string {
  return String(v ?? "").trim();
}

// Valida ObjectId (string o Types.ObjectId)
function isValidObjectId(v: unknown): boolean {
  if (!v) return false;
  if (v instanceof Types.ObjectId) return true;
  if (typeof v === "string") return mongoose.Types.ObjectId.isValid(v);
  return false;
}

// ============================
// DTO Autores/Tutores (sin email)
// ============================
type AuthorDTO = { _id?: Types.ObjectId | string; name: string; lastname: string };

// Type guard: valida que un objeto tenga forma de AuthorDTO mínima
function isAuthorDTO(x: unknown): x is AuthorDTO {
  if (!x || typeof x !== "object") return false;
  const o = x as AnyRecord;
  return typeof o.name === "string" && typeof o.lastname === "string";
}

// Limpia AuthorDTO: trim name/lastname y castea _id si es válido
function normalizeAuthors(
  input: unknown
): Array<{ _id?: Types.ObjectId; name: string; lastname: string }> {
  const arr = parseMaybeJson<unknown[]>(input, []);
  const filtered = arr.filter(isAuthorDTO);

  return filtered
    .map((a) => {
      const name = String(a.name).trim();
      const lastname = String(a.lastname).trim();

      const maybeId = (a as AnyRecord)._id;
      let _id: Types.ObjectId | undefined = undefined;

      if (isValidObjectId(maybeId)) {
        _id =
          maybeId instanceof Types.ObjectId
            ? maybeId
            : new Types.ObjectId(String(maybeId));
      }

      // Si _id vino inválido, lo ignoramos
      return _id ? { _id, name, lastname } : { name, lastname };
    })
    .filter((a) => a.name.length && a.lastname.length);
}

// ✅ NUEVO: fuerza que el primer autor tenga _id = ownerId
function forcePrimaryAuthorId(
  authors: Array<{ _id?: Types.ObjectId; name: string; lastname: string }>,
  ownerId: Types.ObjectId
) {
  if (!Array.isArray(authors) || authors.length === 0) return authors;

  const first = authors[0];
  // Clonamos para no mutar referencias raras
  const cloned = [...authors];

  cloned[0] = {
    ...first,
    _id: ownerId,
  };

  return cloned;
}

// GET /theses?sortBy=title|createdAt|likes&order=asc|desc
export async function getAllTheses(req: Request, res: Response) {
  try {
    const { sortBy = "createdAt", order = "desc" } = req.query;

    const sortField =
      sortBy === "title" || sortBy === "likes" ? String(sortBy) : "createdAt";
    const sortOrder = order === "asc" ? 1 : -1;

    const theses = await Thesis.find()
      .populate("uploadedBy", "name lastname")
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
      .populate("uploadedBy", "name lastname")
      .populate("institution", "name type country");

    return res.json(theses);
  } catch (err) {
    console.error("Error getThesesByInstitutionId:", err);
    return res.status(500).json({ message: "Error del servidor" });
  }
}

// GET /theses/:id
export async function getThesisById(req: Request, res: Response) {
  try {
    const { id } = req.params;

    if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: "ID de tesis inválido" });
    }

    const thesis = await Thesis.findById(id)
      .populate("uploadedBy", "name lastname")
      .populate("institution", "name");

    if (!thesis) return res.status(404).json({ message: "Tesis no encontrada" });
    return res.json(thesis);
  } catch (err) {
    console.error("Error getThesisById", err);
    return res.status(500).json({ message: "Error del servidor" });
  }
}

// POST /theses (multipart pdf + data)
export async function createThesis(req: AuthRequest, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ message: "No autorizado" });
    if (!req.file) return res.status(400).json({ message: "Archivo PDF requerido" });

    const body = req.body?.data
      ? parseMaybeJson<AnyRecord>(req.body.data, {})
      : (req.body as AnyRecord);

    const title = toRequiredTrimmedString(body.title);
    const summary = toRequiredTrimmedString(body.summary);
    const language = toRequiredTrimmedString(body.language);
    const degree = toRequiredTrimmedString(body.degree);
    const field = toOptionalTrimmedString(body.field);
    const department = toOptionalTrimmedString(body.department);

    // date
    const dateRaw = body.date;
    let date: Date | undefined = undefined;
    if (typeof dateRaw === "string" || typeof dateRaw === "number") {
      const d = new Date(dateRaw);
      if (!Number.isNaN(d.getTime())) date = d;
    } else if (dateRaw instanceof Date) {
      if (!Number.isNaN(dateRaw.getTime())) date = dateRaw;
    }

    // ✅ institution ahora es opcional (solo guardar si es válido)
    const institutionRaw = body.institution;
    const institution = isValidObjectId(institutionRaw)
      ? new Types.ObjectId(String(institutionRaw))
      : undefined;

    // ✅ authors/tutors sin email y con _id opcional
    let parsedAuthors = normalizeAuthors(body.authors);
    const parsedTutors = normalizeAuthors(body.tutors);

    // keywords
    const keywords = parseMaybeJson<string[]>(body.keywords, [])
      .map((k) => String(k).trim())
      .filter((k) => k.length);

    if (!title || !summary || !language || !degree) {
      return res.status(400).json({ message: "Faltan campos obligatorios" });
    }

    if (!Array.isArray(parsedAuthors) || parsedAuthors.length === 0) {
      return res.status(400).json({ message: "Debe haber al menos un autor" });
    }

    // ✅ MODIFICACIÓN: el autor principal SIEMPRE tiene el _id del creador (uploadedBy)
    parsedAuthors = forcePrimaryAuthorId(parsedAuthors, req.user._id);

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
      date,
      institution, // opcional
      department,
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
    return res.status(500).json({ message: "Error al crear tesis", error: message });
  }
}

/**
 * PATCH /theses/:id
 * Requiere: auth + (opcional) multer pdf
 */
export async function updateThesis(req: AuthRequest, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ message: "No autorizado" });

    const { id } = req.params;
    if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: "ID de tesis inválido" });
    }

    const thesis = await Thesis.findById(id);
    if (!thesis) return res.status(404).json({ message: "Tesis no encontrada" });

    if (thesis.uploadedBy?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "No puedes editar esta tesis" });
    }

    const body: AnyRecord = req.body?.data
      ? parseMaybeJson<AnyRecord>(req.body.data, {})
      : (req.body as AnyRecord);

    // Campos permitidos
    const updates: Record<string, unknown> = {};

    if (body.title !== undefined) updates.title = toRequiredTrimmedString(body.title);
    if (body.summary !== undefined) updates.summary = toRequiredTrimmedString(body.summary);
    if (body.language !== undefined) updates.language = toRequiredTrimmedString(body.language);
    if (body.degree !== undefined) updates.degree = toRequiredTrimmedString(body.degree);
    if (body.field !== undefined) updates.field = toOptionalTrimmedString(body.field);
    if (body.department !== undefined) updates.department = toOptionalTrimmedString(body.department);

    // date (si viene)
    if (body.date !== undefined) {
      const raw = body.date;
      let d: Date | undefined;
      if (typeof raw === "string" || typeof raw === "number") {
        const dd = new Date(raw);
        if (!Number.isNaN(dd.getTime())) d = dd;
      } else if (raw instanceof Date) {
        if (!Number.isNaN(raw.getTime())) d = raw;
      }
      if (d) updates.date = d;
    }

    // authors/tutors/keywords con parsing seguro
    if (body.authors !== undefined) {
      let a = normalizeAuthors(body.authors);
      if (a.length === 0) {
        return res.status(400).json({ message: "Debe haber al menos un autor" });
      }

      // ✅ MODIFICACIÓN: si actualizan authors, el autor principal queda amarrado al uploadedBy
      const ownerId = thesis.uploadedBy as Types.ObjectId;
      a = forcePrimaryAuthorId(a, ownerId);

      updates.authors = a;
    }
    if (body.tutors !== undefined) {
      updates.tutors = normalizeAuthors(body.tutors);
    }
    if (body.keywords !== undefined) {
      updates.keywords = parseMaybeJson<string[]>(body.keywords, [])
        .map((k) => String(k).trim())
        .filter((k) => k.length);
    }

    // ✅ Si llega PDF nuevo: re-subir y actualizar CID/hash
    if (req.file) {
      const { cid, fileHash } = await uploadPdfBufferToPinata(
        req.file.buffer,
        req.file.originalname
      );
      updates.ipfsCid = cid;
      updates.fileHash = fileHash;
      updates.hashAlgorithm = "sha256";
    }

    // ✅ Cualquier edición vuelve a PENDING (y opcionalmente podrías limpiar txHash)
    updates.status = "PENDING";
    // Si quieres ser estricto: al cambiar PDF o metadata, invalida certificación previa:
    // updates.txHash = undefined;
    // updates.chainId = undefined;
    // updates.blockNumber = undefined;

    const updated = await Thesis.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true }
    )
      .populate("uploadedBy", "name lastname")
      .populate("institution", "name");

    return res.json(updated);
  } catch (err) {
    console.error("Error updateThesis", err);
    return res.status(500).json({ message: "Error del servidor" });
  }
}

// PATCH /theses/:id/status (o similar)
// Institución marca como aprobada o no
export async function setThesisStatus(req: AuthRequest, res: Response) {
  try {
    if (!req.user && !req.institution) {
      return res.status(401).json({ message: "No autorizado" });
    }

    const { id } = req.params;
    const { status } = req.body as { status: CertificationStatus };

    if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: "ID de tesis inválido" });
    }

    if (!["PENDING", "APPROVED", "REJECTED"].includes(status)) {
      return res.status(400).json({ message: "Status inválido" });
    }

    const thesis = await Thesis.findById(id);
    if (!thesis) return res.status(404).json({ message: "Tesis no encontrada" });

    // ✅ ahora institution puede ser opcional: sin institución NO se puede certificar
    if (!thesis.institution) {
      return res.status(400).json({
        message: "Esta tesis no tiene institución asociada; no se puede certificar.",
      });
    }

    let canCertify = false;

    // Caso: user con instituciones asociadas
    if (req.user?.institutions) {
      const isMember = req.user.institutions.some(
        (instId) => instId.toString() === thesis.institution!.toString()
      );
      if (isMember) canCertify = true;
    }

    // Caso: institución autenticada directamente
    if (req.institution) {
      if (req.institution._id.toString() === thesis.institution!.toString()) {
        canCertify = true;
      }
    }

    if (!canCertify) {
      return res.status(403).json({ message: "No puedes certificar esta tesis" });
    }

    thesis.status = status;

    if (status === "APPROVED") {
      if (!thesis.txHash) {
        if (!thesis.uploadedBy) {
          return res.status(400).json({
            message: "Tesis sin uploadedBy, no se puede certificar",
          });
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

// POST /theses/:id/like
export async function toggleLikeThesis(req: AuthRequest, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ message: "No autorizado" });

    const { id } = req.params;
    if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: "ID de tesis inválido" });
    }

    const thesis = await Thesis.findById(id);
    if (!thesis) return res.status(404).json({ message: "Tesis no encontrada" });

    const user = await User.findById(req.user._id);
    if (!user) return res.status(401).json({ message: "Usuario no encontrado" });

    const userIdStr = req.user._id.toString();

    const alreadyLikedUser = user.likedTheses.some((tId) => tId.toString() === id);
    const alreadyLikedThesis =
      Array.isArray(thesis.likedBy) &&
      thesis.likedBy.some((uId) => uId.toString() === userIdStr);

    const alreadyLiked = alreadyLikedUser || alreadyLikedThesis;

    if (alreadyLiked) {
      user.likedTheses = user.likedTheses.filter((tId) => tId.toString() !== id);
      thesis.likedBy = (thesis.likedBy || []).filter((uId) => uId.toString() !== userIdStr);
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
