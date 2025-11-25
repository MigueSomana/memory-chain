import { Request, Response, NextFunction } from 'express';
import { Thesis, IThesisDocument } from '../models/thesis.model';
import { uploadThesisFile } from '../services/storage.service';

// Si usas multer:
interface MulterRequest extends Request {
  file?: Express.Multer.File;
}

export const createThesis = async (req: MulterRequest, res: Response, next: NextFunction) => {
  try {
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
    } = req.body;

    if (!req.file) {
      return res.status(400).json({ message: 'Archivo de tesis requerido' });
    }

    // Subir a Storacha/IPFS
    const buffer = req.file.buffer;
    const { cid, hash } = await uploadThesisFile(buffer);

    const thesis: IThesisDocument = new Thesis({
      title,
      authors, // asegúrate que viene como array de IAuthor desde el frontend
      advisors,
      summary,
      keywords,
      language,
      degree,
      field,
      year,
      likes: 0,
      institution,
      department,
      doi,
      version: 1,
      status: 'pending',
      uploadedBy: (req as any).user?._id, // si ya tienes middleware de auth
      fileHash: hash,
      hashAlgorithm: 'sha256',
      ipfsCid: cid,
    });

    await thesis.save();

    return res.status(201).json(thesis);
  } catch (error) {
    next(error);
  }
};

export const getTheses = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const list = await Thesis.find().populate('institution').populate('uploadedBy');
    return res.json(list);
  } catch (error) {
    next(error);
  }
};
