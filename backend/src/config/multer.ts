import multer from "multer";

// Configura multer para guardar archivos en memoria (Buffer)
const storage = multer.memoryStorage();

// Middleware para subir PDFs (tesis)
export const uploadPdf = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // límite de tamaño (50MB)
  fileFilter: (_req, file, cb) => {
    // Solo permite archivos PDF
    if (file.mimetype !== "application/pdf") {
      return cb(new Error("Solo se permiten archivos PDF"));
    }
    cb(null, true);
  },
});

// Middleware para subir imágenes (perfil / logo)
export const uploadImage = multer({
  storage,
  limits: { fileSize: 3 * 1024 * 1024 }, // límite de tamaño (3MB)
  fileFilter: (_req, file, cb) => {
    // Acepta PNG, JPG, JPEG y WebP
    const ok = /image\/(png|jpe?g|webp)/.test(file.mimetype);
    if (!ok) return cb(new Error("Solo se permiten imágenes PNG/JPG/WebP"));
    cb(null, true);
  },
});
