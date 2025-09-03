import { Request, Response } from 'express';
import { Thesis } from '../models/Thesis';
import Institution from '../models/Institution';
import { uploadToIPFS } from '../utils/ipfs';
import { anchorToPolygon } from '../utils/blockchain';
import { cleanupTempFile } from '../middlewares/upload.middleware';
import { Types } from 'mongoose';

// Importar tipos personalizados
import '../types/express';

export async function uploadThesisWithFile(req: Request, res: Response) {
  const user = req.user;
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const fileInfo = req.fileInfo;
  if (!fileInfo) return res.status(400).json({ error: 'Missing file' });

  try {
    // Validar que la institución existe
    if (!Types.ObjectId.isValid(req.body.institution)) {
      return res.status(400).json({ error: 'Invalid institution ID format' });
    }

    const institutionExists = await Institution.findById(req.body.institution);
    if (!institutionExists) {
      return res.status(400).json({ error: 'Institution not found' });
    }

    // Procesar authors si viene como string JSON
    let authors = req.body.authors;
    if (typeof authors === 'string') {
      try {
        authors = JSON.parse(authors);
      } catch {
        return res.status(400).json({ error: 'Invalid authors format' });
      }
    }

    // Validar authors
    if (!Array.isArray(authors) || authors.length === 0) {
      return res.status(400).json({ error: 'At least one author is required' });
    }

    // Procesar keywords
    let keywords = req.body.keywords || [];
    if (typeof keywords === 'string') {
      keywords = keywords.split(',').map((k: string) => k.trim()).filter(Boolean);
    }

    // 1) IPFS Upload
    console.log('Uploading to IPFS...');
    const { hash, ipfsCid } = await uploadToIPFS(fileInfo.path);

    // 2) Blockchain anchor
    console.log('Anchoring to blockchain...');
    const anchor = await anchorToPolygon({ 
      thesisId: 'temp', 
      fileHash: hash, 
      ipfsCid 
    });

    // 3) Crear tesis en BD
    const thesis = await Thesis.create({
      title: req.body.title,
      authors: authors,
      summary: req.body.summary,
      keywords: keywords,
      language: req.body.language,
      degree: req.body.degree,
      workType: req.body.workType,
      department: req.body.department,
      institution: new Types.ObjectId(req.body.institution),
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

    // Poblar para respuesta
    const populatedThesis = await Thesis.findById(thesis._id)
      .populate('institution', 'name emailDomain country type')
      .populate('uploadedBy', 'name lastname email');

    console.log(`Thesis created successfully: ${thesis._id}`);
    return res.status(201).json(populatedThesis);
  } catch (e: any) {
    console.error('Error creating thesis:', e);
    return res.status(500).json({ 
      error: 'Error creating thesis', 
      details: e.message 
    });
  } finally {
    cleanupTempFile(fileInfo?.path);
  }
}

// GET /api/theses
export async function getAllTheses(req: Request, res: Response) {
  try {
    const { 
      page = '1', 
      limit = '10', 
      q, 
      language, 
      degree, 
      workType, 
      institution,
      author,
      status
    } = req.query as any;
    
    const p = Math.max(parseInt(page) || 1, 1);
    const l = Math.min(Math.max(parseInt(limit) || 10, 1), 50);

    const filter: any = {};
    
    // Búsqueda de texto
    if (q) filter.$text = { $search: q };
    
    // Filtros específicos
    if (language) filter.language = language;
    if (degree) filter.degree = degree;
    if (workType) filter.workType = workType;
    if (status) filter.status = status;
    if (institution && Types.ObjectId.isValid(institution)) {
      filter.institution = new Types.ObjectId(institution);
    }
    
    // Filtro por autor
    if (author) {
      filter['authors.name'] = { $regex: author, $options: 'i' };
    }

    const [theses, total] = await Promise.all([
      Thesis.find(filter)
        .sort({ createdAt: -1 })
        .skip((p - 1) * l)
        .limit(l)
        .populate('institution', 'name emailDomain country type')
        .populate('uploadedBy', 'name lastname email')
        .lean(),
      Thesis.countDocuments(filter)
    ]);

    return res.json({
      data: theses,
      pagination: { 
        page: p, 
        limit: l, 
        total, 
        totalPages: Math.ceil(total / l),
        hasNext: p * l < total,
        hasPrev: p > 1
      }
    });
  } catch (e: any) {
    console.error('Error fetching theses:', e);
    return res.status(500).json({ 
      error: 'Error fetching theses', 
      details: e.message 
    });
  }
}

export async function getThesisById(req: Request, res: Response) {
  try {
    const { id } = req.params;
    
    if (!Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid thesis ID format' });
    }

    const thesis = await Thesis.findById(id)
      .populate('institution', 'name emailDomain country type departments')
      .populate('uploadedBy', 'name lastname email educationalEmails')
      .lean();
      
    if (!thesis) {
      return res.status(404).json({ error: 'Thesis not found' });
    }

    return res.json(thesis);
  } catch (e: any) {
    console.error('Error fetching thesis:', e);
    return res.status(500).json({ 
      error: 'Error fetching thesis', 
      details: e.message 
    });
  }
}