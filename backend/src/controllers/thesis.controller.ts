import { Request, Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { Thesis, CertificationStatus } from "../models/thesis.model";
import { User } from "../models/user.model";
import { uploadPdfBufferToPinata } from "../services/pinata.service";
import mongoose, { Types } from "mongoose";
import { ethers } from "ethers";
import abi from "../blockchain/ThesisCertification.abi.json";

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

function toOptionalTrimmedString(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const s = v.trim();
  return s.length ? s : undefined;
}

function toRequiredTrimmedString(v: unknown): string {
  return String(v ?? "").trim();
}

function isValidObjectId(v: unknown): boolean {
  if (!v) return false;
  if (v instanceof Types.ObjectId) return true;
  if (typeof v === "string") return mongoose.Types.ObjectId.isValid(v);
  return false;
}

// ============================
// DTO Autores/Tutores
// ============================
type AuthorDTO = { _id?: Types.ObjectId | string; name: string; lastname: string };

function isAuthorDTO(x: unknown): x is AuthorDTO {
  if (!x || typeof x !== "object") return false;
  const o = x as AnyRecord;
  return typeof o.name === "string" && typeof o.lastname === "string";
}

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
        _id = new Types.ObjectId(String(maybeId));
      }

      return { _id, name, lastname };
    })
    .filter((a) => a.name.length && a.lastname.length);
}

// Fuerza que el autor principal tenga el _id del creador
function forcePrimaryAuthorId(
  authors: Array<{ _id?: Types.ObjectId; name: string; lastname: string }>,
  ownerId: Types.ObjectId
) {
  if (!authors.length) return authors;
  const first = authors[0];
  authors[0] = { ...first, _id: ownerId };
  return authors;
}

// ============================
// Blockchain helper con wallet dinámica
// ============================
const RPC_URL = process.env.POLYGON_RPC_URL!;
const BACKEND_PK = process.env.BACKEND_WALLET_PRIVATE_KEY!;
const CONTRACT_ADDRESS = process.env.CERT_CONTRACT_ADDRESS!;
const CHAIN_ID = Number(process.env.POLYGON_CHAIN_ID || 80002);

function isPrivateKey(pk?: string) {
  if (!pk) return false;
  const s = pk.trim();
  return /^0x[0-9a-fA-F]{64}$/.test(s);
}

async function certifyOnChainDynamic(params: {
  thesisId: string;
  userId: string;
  institutionId: string;
  ipfsCid: string;
  fileHash: string;
  signerPrivateKey?: string; // si viene, se usa
}) {
  const provider = new ethers.JsonRpcProvider(RPC_URL, CHAIN_ID);
  const signerKey = isPrivateKey(params.signerPrivateKey)
    ? params.signerPrivateKey!.trim()
    : BACKEND_PK;

  const signer = new ethers.Wallet(signerKey, provider);
  const contract = new ethers.Contract(CONTRACT_ADDRESS, abi, signer);

  // hashAlgorithm eliminado en DB, pero el contrato (si aún lo pide) puede seguir recibiendo un valor fijo
  const hashAlgorithm = "sha256";

  const tx = await contract.certify(
    params.thesisId,
    params.userId,
    params.institutionId,
    params.ipfsCid,
    params.fileHash,
    hashAlgorithm
  );

  const receipt = await tx.wait();

  return {
    txHash: tx.hash as string,
    chainId: CHAIN_ID,
    blockNumber: receipt?.blockNumber ? Number(receipt.blockNumber) : undefined,
  };
}

// ============================
// GET /theses
// ============================
export async function getAllTheses(_req: Request, res: Response) {
  try {
    const theses = await Thesis.find()
      .populate("uploadedBy", "name lastname")
      .populate("institution", "name");

    return res.json(theses);
  } catch (err) {
    console.error("Error getAllTheses", err);
    return res.status(500).json({ message: "Error del servidor" });
  }
}

export async function getThesesByInstitutionId(req: Request, res: Response) {
  try {
    const { idInstitution } = req.params;

    if (!idInstitution || !idInstitution.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: "ID de institución inválido" });
    }

    const theses = await Thesis.find({ institution: idInstitution })
      .populate("uploadedBy", "name lastname")
      .populate("institution", "name");

    return res.json(theses);
  } catch (err) {
    console.error("Error getThesesByInstitutionId", err);
    return res.status(500).json({ message: "Error del servidor" });
  }
}

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

// POST /theses
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

    // institution opcional
    const institutionRaw = body.institution;
    const institution = isValidObjectId(institutionRaw)
      ? new Types.ObjectId(String(institutionRaw))
      : undefined;

    let parsedAuthors = normalizeAuthors(body.authors);
    const parsedTutors = normalizeAuthors(body.tutors);

    const keywords = parseMaybeJson<string[]>(body.keywords, [])
      .map((k) => String(k).trim())
      .filter((k) => k.length);

    if (!title || !summary || !language || !degree) {
      return res.status(400).json({ message: "Faltan campos obligatorios" });
    }

    if (!Array.isArray(parsedAuthors) || parsedAuthors.length === 0) {
      return res.status(400).json({ message: "Debe haber al menos un autor" });
    }

    parsedAuthors = forcePrimaryAuthorId(parsedAuthors, req.user._id);

    const { cid, fileHash } = await uploadPdfBufferToPinata(
      req.file.buffer,
      req.file.originalname
    );

    // ✅ regla de status según si hay institución
    const initialStatus: CertificationStatus = institution ? "PENDING" : "NOT_CERTIFIED";

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
      uploadedBy: req.user._id,
      fileHash,
      ipfsCid: cid,
      status: initialStatus,
      quotes: 0,
      likes: 0,
      likedBy: [],
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
 * ✅ resetea status según institución y limpia txHash/chain data
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

    const updates: Record<string, unknown> = {};

    if (body.title !== undefined) updates.title = toRequiredTrimmedString(body.title);
    if (body.summary !== undefined) updates.summary = toRequiredTrimmedString(body.summary);
    if (body.language !== undefined) updates.language = toRequiredTrimmedString(body.language);
    if (body.degree !== undefined) updates.degree = toRequiredTrimmedString(body.degree);
    if (body.field !== undefined) updates.field = toOptionalTrimmedString(body.field);
    if (body.department !== undefined) updates.department = toOptionalTrimmedString(body.department);

    // institution (si viene)
    if (body.institution !== undefined) {
      const inst = isValidObjectId(body.institution)
        ? new Types.ObjectId(String(body.institution))
        : undefined;
      updates.institution = inst;
    }

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

    if (body.authors !== undefined) {
      let a = normalizeAuthors(body.authors);
      if (a.length === 0) {
        return res.status(400).json({ message: "Debe haber al menos un autor" });
      }
      const ownerId = thesis.uploadedBy as Types.ObjectId;
      a = forcePrimaryAuthorId(a, ownerId);
      updates.authors = a;
    }

    if (body.tutors !== undefined) updates.tutors = normalizeAuthors(body.tutors);

    if (body.keywords !== undefined) {
      updates.keywords = parseMaybeJson<string[]>(body.keywords, [])
        .map((k) => String(k).trim())
        .filter((k) => k.length);
    }

    // PDF nuevo
    if (req.file) {
      const { cid, fileHash } = await uploadPdfBufferToPinata(
        req.file.buffer,
        req.file.originalname
      );
      updates.ipfsCid = cid;
      updates.fileHash = fileHash;
    }

    // ✅ Regla: al actualizar, reset de status según institución final (nueva o existente)
    const finalInstitution =
      (updates.institution as Types.ObjectId | undefined) ?? thesis.institution ?? undefined;

    updates.status = finalInstitution ? "PENDING" : "NOT_CERTIFIED";

    // ✅ Invalida certificación previa (si existía)
    updates.txHash = undefined;
    updates.chainId = undefined;
    updates.blockNumber = undefined;

    const updated = await Thesis.findByIdAndUpdate(id, { $set: updates }, { new: true })
      .populate("uploadedBy", "name lastname")
      .populate("institution", "name");

    return res.json(updated);
  } catch (err) {
    console.error("Error updateThesis", err);
    return res.status(500).json({ message: "Error del servidor" });
  }
}

// PATCH /theses/:id/status
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

    // sin institución no se certifica
    if (!thesis.institution) {
      return res.status(400).json({
        message: "Esta tesis no tiene institución asociada; no se puede certificar.",
      });
    }

    let canCertify = false;

    if (req.user?.institutions) {
      const isMember = req.user.institutions.some(
        (instId) => instId.toString() === thesis.institution!.toString()
      );
      if (isMember) canCertify = true;
    }

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

        // ✅ si aprueba institución y tiene wallet (private key), se firma desde ahí
        const signerPrivateKey =
          req.institution?.wallet && String(req.institution.wallet).trim().length
            ? String(req.institution.wallet).trim()
            : undefined;

        const onchain = await certifyOnChainDynamic({
          thesisId: thesis._id.toString(),
          userId: thesis.uploadedBy.toString(),
          institutionId: thesis.institution.toString(),
          ipfsCid: thesis.ipfsCid,
          fileHash: thesis.fileHash,
          signerPrivateKey,
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

/**
 * ✅ NUEVO: contador de citas (quotes++)
 * POST /theses/:id/quote  (tú lo conectas en routes)
 */
export async function incrementQuoteThesis(req: Request, res: Response) {
  try {
    const { id } = req.params;
    if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: "ID de tesis inválido" });
    }

    const updated = await Thesis.findByIdAndUpdate(
      id,
      { $inc: { quotes: 1 } },
      { new: true }
    );

    if (!updated) return res.status(404).json({ message: "Tesis no encontrada" });

    return res.json({ thesis: updated, quoted: true });
  } catch (err) {
    console.error("Error incrementQuoteThesis", err);
    return res.status(500).json({ message: "Error del servidor" });
  }
}