import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { Request, Response, NextFunction } from 'express';

const uploadDir = path.join(process.cwd(), 'uploads', 'theses');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ts = Date.now();
    const safe = file.originalname.replace(/\s+/g, '_');
    cb(null, `${ts}_${safe}`);
  }
});
 
const allowed = ['application/pdf'];
export const fileFilter: multer.Options['fileFilter'] = (_req, file, cb) =>
  allowed.includes(file.mimetype) ? cb(null, true) : cb(new Error('Only PDF files are allowed'));

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 25 * 1024 * 1024, files: 1 }
});

export function handleMulterError(err: any, _req: Request, res: Response, next: NextFunction) {
  if (err instanceof multer.MulterError || err?.message) {
    return res.status(400).json({ error: err.message || 'Upload error' });
  }
  next();
}

export function validateFileUpload(req: Request, res: Response, next: NextFunction) {
  const file = (req as any).file as Express.Multer.File | undefined;
  if (!file) return res.status(400).json({ error: 'PDF file is required' });
  (req as any).fileInfo = {
    originalName: file.originalname,
    filename: file.filename,
    path: file.path,
    size: file.size,
    mimetype: file.mimetype
  };
  next();
}

export function cleanupTempFile(filePath?: string) {
  if (filePath && fs.existsSync(filePath)) {
    try { fs.unlinkSync(filePath); } catch { /* ignore */ }
  }
}
