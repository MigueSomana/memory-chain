import multer from "multer";

const storage = multer.memoryStorage();

export const uploadPdf = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 25MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype !== "application/pdf") {
      return cb(new Error("Solo se permiten archivos PDF"));
    }
    cb(null, true);
  },
});

export const uploadImage = multer({
  storage,
  limits: { fileSize: 3 * 1024 * 1024 }, // 3MB como tu frontend
  fileFilter: (_req, file, cb) => {
    const ok = /image\/(png|jpe?g|webp)/.test(file.mimetype);
    if (!ok) return cb(new Error("Solo se permiten imágenes PNG/JPG/WebP"));
    cb(null, true);
  },
});
