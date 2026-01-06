import { Request, Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { Thesis } from "../models/thesis.model";
import { CertificationStatus } from "../models/types";
import { User } from "../models/user.model";
import { uploadPdfBufferToPinata } from "../services/pinata.service";
import { certifyOnChain } from "../services/blockchain.service";

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

// DTO simple para autores/tutores (lo mínimo necesario)
type AuthorDTO = { name: string; lastname: string; email?: string };

// Type guard: valida que un objeto tenga forma de AuthorDTO
function isAuthorDTO(x: unknown): x is AuthorDTO {
  if (!x || typeof x !== "object") return false;
  const o = x as AnyRecord;
  return typeof o.name === "string" && typeof o.lastname === "string";
}

// GET /theses?sortBy=title|createdAt|likes&order=asc|desc
// Lista todas las tesis con sort dinámico y populate de relaciones
export async function getAllTheses(req: Request, res: Response) {
  try {
    const { sortBy = "createdAt", order = "desc" } = req.query;

    // Solo permite ordenar por campos conocidos (evita sort inyectado)
    const sortField =
      sortBy === "title" || sortBy === "likes" ? String(sortBy) : "createdAt";
    const sortOrder = order === "asc" ? 1 : -1;

    const theses = await Thesis.find()
      .populate("uploadedBy", "name lastname email") // datos básicos del uploader
      .populate("institution", "name") // datos básicos de la institución
      .sort({ [sortField]: sortOrder }); // sort seguro

    return res.json(theses);
  } catch (err) {
    console.error("Error getAllTheses", err);
    return res.status(500).json({ message: "Error del servidor" });
  }
}

// GET /theses/institution/:idInstitution
// Lista tesis filtradas por institución
export async function getThesesByInstitutionId(req: Request, res: Response) {
  try {
    const { idInstitution } = req.params;

    // Validación rápida de ObjectId para evitar consultas inválidas
    if (!idInstitution || !idInstitution.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: "ID de institución inválido" });
    }

    const theses = await Thesis.find({ institution: idInstitution })
      .populate("uploadedBy", "name lastname email") // info uploader
      .populate("institution", "name type country"); // info institución

    return res.json(theses);
  } catch (err) {
    console.error("Error getThesesByInstitutionId:", err);
    return res.status(500).json({ message: "Error del servidor" });
  }
}

// GET /theses/:id
// Obtiene una tesis por ID con relaciones pobladas
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

// ✅ Crear tesis: requiere PDF (multer)
// Flujo: validar -> parsear body -> subir a Pinata -> guardar en Mongo
export async function createThesis(req: AuthRequest, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ message: "No autorizado" });
    if (!req.file) {
      return res.status(400).json({ message: "Archivo PDF requerido" });
    }

    // Soporta JSON normal o multipart con campo "data"
    const body = req.body?.data
      ? parseMaybeJson<AnyRecord>(req.body.data, {})
      : (req.body as AnyRecord);

    // Normalización básica de strings
    const title = String(body.title ?? "").trim();
    const summary = String(body.summary ?? "").trim();
    const language = String(body.language ?? "").trim();
    const degree = String(body.degree ?? "").trim();
    const field =
      typeof body.field === "string" ? body.field.trim() : undefined;
    const department =
      typeof body.department === "string" ? body.department.trim() : undefined;
    const dateRaw = body.date;
    let date: Date | undefined = undefined;

    if (typeof dateRaw === "string" || typeof dateRaw === "number") {
      const d = new Date(dateRaw);
      if (!Number.isNaN(d.getTime())) date = d;
    } else if (dateRaw instanceof Date) {
      if (!Number.isNaN(dateRaw.getTime())) date = dateRaw;
    }

    // ID de institución (viene del cliente)
    const institution = body.institution;

    // Parseo seguro de arrays (por si vienen como string)
    const authors = parseMaybeJson<unknown[]>(body.authors, []);
    const tutors = parseMaybeJson<unknown[]>(body.tutors, []);
    const keywords = parseMaybeJson<string[]>(body.keywords, []);

    // Filtra solo objetos válidos (evita basura/estructura rara)
    const parsedAuthors: AuthorDTO[] = authors.filter(isAuthorDTO);
    const parsedTutors: AuthorDTO[] = tutors.filter(isAuthorDTO);

    // Sube PDF a Pinata y calcula hash del archivo
    const { cid, fileHash } = await uploadPdfBufferToPinata(
      req.file.buffer,
      req.file.originalname
    );

    // Crea la tesis en Mongo con metadata + IPFS + hash
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
      institution,
      department,
      uploadedBy: req.user._id, // quien la subió
      fileHash,
      hashAlgorithm: "sha256",
      ipfsCid: cid,
      status: "PENDING", // empieza pendiente hasta verificación
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
// Actualiza campos permitidos + opcionalmente re-sube PDF a Pinata
export async function updateThesis(req: AuthRequest, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ message: "No autorizado" });

    const { id } = req.params;
    const thesis = await Thesis.findById(id);
    if (!thesis)
      return res.status(404).json({ message: "Tesis no encontrada" });

    // Solo el uploader puede editar su tesis
    if (thesis.uploadedBy?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "No puedes editar esta tesis" });
    }

    // ✅ soporta JSON normal o multipart con "data"
    const body: AnyRecord = req.body?.data
      ? parseMaybeJson<AnyRecord>(req.body.data, {})
      : (req.body as AnyRecord);

    // Campos permitidos (evita que el estudiante cambie status, txHash, etc.)
    const allowedFields = [
      "title",
      "authors",
      "tutors",
      "summary",
      "keywords",
      "language",
      "degree",
      "field",
      "date",
      "department",
      // NO permitimos status directo desde el estudiante
    ] as const;

    const updates: Record<string, unknown> = {};
    for (const key of allowedFields) {
      if (body[key] !== undefined) {
        updates[key] = body[key];
      }
    }
    // ✅ Parse date si viene como string/number
    if (updates.date !== undefined) {
      const raw = updates.date as unknown;
      let d: Date | undefined;

      if (typeof raw === "string" || typeof raw === "number") {
        const dd = new Date(raw);
        if (!Number.isNaN(dd.getTime())) d = dd;
      } else if (raw instanceof Date) {
        if (!Number.isNaN(raw.getTime())) d = raw;
      }

      // Si no es válida, la eliminamos para no guardar "Invalid Date"
      if (!d) delete updates.date;
      else updates.date = d;
    }

    // Parsear arrays si vienen como string (multipart/form-data)
    if (typeof updates.authors === "string")
      updates.authors = JSON.parse(updates.authors);
    if (typeof updates.tutors === "string")
      updates.tutors = JSON.parse(updates.tutors);
    if (typeof updates.keywords === "string")
      updates.keywords = JSON.parse(updates.keywords);

    // Filtra authors/tutors con shape válida
    if (Array.isArray(updates.authors)) {
      updates.authors = (updates.authors as unknown[]).filter(isAuthorDTO);
    }
    if (Array.isArray(updates.tutors)) {
      updates.tutors = (updates.tutors as unknown[]).filter(isAuthorDTO);
    }

    // ✅ Si llega un PDF nuevo: re-subir a Pinata y actualizar CID/hash
    if (req.file) {
      const { cid, fileHash } = await uploadPdfBufferToPinata(
        req.file.buffer,
        req.file.originalname
      );

      updates.ipfsCid = cid;
      updates.fileHash = fileHash;
      updates.hashAlgorithm = "sha256";
    }

    // ✅ Cualquier edición invalida la aprobación previa y vuelve a PENDING
    updates.status = "PENDING";

    const updated = await Thesis.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true } // devuelve el documento actualizado
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
// Si aprueba y no está en cadena -> certifica en blockchain y guarda txHash
export async function setThesisStatus(req: AuthRequest, res: Response) {
  try {
    // Permite acceso si viene user o institución autenticada
    if (!req.user && !req.institution) {
      return res.status(401).json({ message: "No autorizado" });
    }

    const { id } = req.params;
    const { status } = req.body as { status: CertificationStatus };

    const thesis = await Thesis.findById(id);
    if (!thesis)
      return res.status(404).json({ message: "Tesis no encontrada" });

    let canCertify = false;

    // Caso: user con instituciones asociadas (ej: admin/miembro)
    if (req.user?.institutions) {
      const isMember = req.user.institutions.some(
        (instId) => instId.toString() === thesis.institution.toString()
      );
      if (isMember) canCertify = true;
    }

    // Caso: institución autenticada directamente
    if (req.institution) {
      if (req.institution._id.toString() === thesis.institution.toString()) {
        canCertify = true;
      }
    }

    // Bloquea si no tiene permisos para certificar esa tesis
    if (!canCertify) {
      return res
        .status(403)
        .json({ message: "No puedes certificar esta tesis" });
    }

    // Validación del status permitido
    if (!["PENDING", "APPROVED", "REJECTED"].includes(status)) {
      return res.status(400).json({ message: "Status inválido" });
    }

    thesis.status = status;

    // Si aprueba: ancla en blockchain (solo si no existe txHash)
    if (status === "APPROVED") {
      // Evita doble certificación on-chain
      if (!thesis.txHash) {
        if (!thesis.uploadedBy) {
          return res
            .status(400)
            .json({ message: "Tesis sin uploadedBy, no se puede certificar" });
        }

        // Llama al servicio blockchain para registrar hash/cid e IDs
        const onchain = await certifyOnChain({
          thesisId: thesis._id.toString(),
          userId: thesis.uploadedBy.toString(),
          institutionId: thesis.institution.toString(),
          ipfsCid: thesis.ipfsCid,
          fileHash: thesis.fileHash,
          hashAlgorithm: thesis.hashAlgorithm,
        });

        // Guarda referencia de la transacción on-chain
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
// Sincroniza: User.likedTheses + Thesis.likedBy + contador Thesis.likes
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

    // Verifica like tanto del lado usuario como del lado tesis (por consistencia)
    const alreadyLikedUser = user.likedTheses.some(
      (tId) => tId.toString() === id
    );
    const alreadyLikedThesis =
      Array.isArray(thesis.likedBy) &&
      thesis.likedBy.some((uId) => uId.toString() === userIdStr);

    const alreadyLiked = alreadyLikedUser || alreadyLikedThesis;

    if (alreadyLiked) {
      // Quita like en ambas direcciones
      user.likedTheses = user.likedTheses.filter(
        (tId) => tId.toString() !== id
      );
      thesis.likedBy = (thesis.likedBy || []).filter(
        (uId) => uId.toString() !== userIdStr
      );
      thesis.likes = Math.max((thesis.likes || 0) - 1, 0); // evita negativos
    } else {
      // Agrega like en ambas direcciones
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
