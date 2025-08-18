import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Crear directorio uploads si no existe
const uploadDir = 'uploads/theses';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
} 

// Configuración de almacenamiento temporal
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generar nombre único: timestamp-originalname
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `thesis-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

// Filtro de archivos
const fileFilter = (req: any, file: any, cb: any) => {
  const allowedMimes = ['application/pdf'];
  const allowedExts = /pdf/;
  
  const extname = allowedExts.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedMimes.includes(file.mimetype);
  
  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb(new Error('Only PDF files are allowed'), false);
  }
};

// Configuración de multer
export const upload = multer({
  storage,
  limits: { 
    fileSize: 25 * 1024 * 1024, // 25MB max
    files: 1 // Solo un archivo
  },
  fileFilter,
});

// Middleware para validar que el archivo fue subido
export const validateFileUpload = (req: any, res: any, next: any) => {
  if (!req.file) {
    return res.status(400).json({ 
      error: 'No file uploaded',
      details: 'A PDF file is required'
    });
  }
  
  // Agregar información del archivo al request
  req.fileInfo = {
    originalName: req.file.originalname,
    filename: req.file.filename,
    path: req.file.path,
    size: req.file.size,
    mimetype: req.file.mimetype
  };
  
  next();
};

// Función para limpiar archivos temporales
export const cleanupTempFile = (filePath: string) => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`Cleaned up temp file: ${filePath}`);
    }
  } catch (error) {
    console.error(`Error cleaning up file ${filePath}:`, error);
  }
};

// Middleware de manejo de errores de multer
export const handleMulterError = (error: any, req: any, res: any, next: any) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        error: 'File too large',
        details: 'File size must be less than 25MB'
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        error: 'Too many files',
        details: 'Only one file is allowed'
      });
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        error: 'Unexpected file field',
        details: 'File must be uploaded in "file" field'
      });
    }
  }
  
  if (error.message === 'Only PDF files are allowed') {
    return res.status(400).json({
      error: 'Invalid file type',
      details: 'Only PDF files are accepted'
    });
  }
  
  next(error);
};