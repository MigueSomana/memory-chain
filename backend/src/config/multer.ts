import multer from "multer";

const storage = multer.memoryStorage(); // guarda el archivo en RAM (req.file.buffer)

export const upload = multer({
  storage,
  limits: {
    fileSize: 3 * 1024 * 1024 // 3 MB máx, ajusta si quieres
  },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Solo se permiten imágenes"));
    }
    cb(null, true);
  }
});
