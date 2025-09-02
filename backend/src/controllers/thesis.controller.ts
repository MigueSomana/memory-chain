import { Request, Response } from 'express';
import { Thesis } from '../models/Thesis';
import { uploadToIPFS } from '../utils/ipfs';
import { anchorToPolygon } from '../utils/blockchain';
import { cleanupTempFile } from '../middlewares/upload.middleware';

export async function uploadThesisWithFile(req: Request, res: Response) {
  const user = req.user;
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const fileInfo = (req as any).fileInfo as {
    filename: string; path: string; size: number; mimetype: string;
  };
  if (!fileInfo) return res.status(400).json({ error: 'Missing file' });

  try {
    // 1) IPFS
    const { hash, ipfsCid } = await uploadToIPFS(fileInfo.path);

    // 2) Blockchain anchor (mock/real)
    const anchor = await anchorToPolygon({ thesisId: 'temp', fileHash: hash, ipfsCid });

    // 3) Persistir
    const thesis = await Thesis.create({
      title: req.body.title,
      authors: req.body.authors,
      summary: req.body.summary,
      keywords: req.body.keywords || [],
      language: req.body.language,
      degree: req.body.degree,
      workType: req.body.workType,
      department: req.body.department,
      institution: req.body.institution,
      uploadedBy: user._id,
      publicationDate: req.body.publicationDate ? new Date(req.body.publicationDate) : new Date(),

      file: {
        filename: fileInfo.filename,
        size: fileInfo.size,
        mimetype: fileInfo.mimetype,
        hash,
        ipfsCid
      },

      chain: anchor.chain,
      blockchainHash: anchor.blockchainHash,
      txId: anchor.txId,
      blockNumber: anchor.blockNumber,
      status: 'published'
    });

    return res.status(201).json(thesis);
  } catch (e: any) {
    return res.status(500).json({ error: 'Error creating thesis', details: e.message });
  } finally {
    cleanupTempFile(fileInfo?.path);
  }
}

// GET /api/theses
export async function getAllTheses(req: Request, res: Response) {
  const { page = '1', limit = '10', q, language, degree, workType, institution } = req.query as any;
  const p = Math.max(parseInt(page), 1);
  const l = Math.min(Math.max(parseInt(limit), 1), 50);

  const filter: any = {};
  if (q) filter.$text = { $search: q };
  if (language) filter.language = language;
  if (degree) filter.degree = degree;
  if (workType) filter.workType = workType;
  if (institution) filter.institution = institution;

  const [theses, total] = await Promise.all([
    Thesis.find(filter).sort({ createdAt: -1 }).skip((p - 1) * l).limit(l)
      .populate('institution', 'name emailDomain country')
      .populate('uploadedBy', 'name lastname email'),
    Thesis.countDocuments(filter)
  ]);

  return res.json({
    data: theses,
    pagination: { page: p, limit: l, total, totalPages: Math.ceil(total / l) }
  });
}

export async function getThesisById(req: Request, res: Response) {
  const t = await Thesis.findById(req.params.id)
    .populate('institution', 'name emailDomain country')
    .populate('uploadedBy', 'name lastname email');
  if (!t) return res.status(404).json({ error: 'Not found' });
  res.json(t);
}
