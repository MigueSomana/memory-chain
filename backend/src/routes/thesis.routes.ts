import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import {
  getAllTheses,
  getThesisById,
  createThesis,
  updateThesis,
  setThesisStatus,
  toggleLikeThesis,
  getThesesByInstitutionId,
} from "../controllers/thesis.controller";
import { uploadPdf } from "../config/multer"; // middleware para subir PDFs

const router = Router();

// Crear thesis (requiere auth, acepta PDF opcional)
router.post("/", authMiddleware, uploadPdf.single("pdf"), createThesis);

// Editar thesis (solo el uploader, PDF opcional)
router.patch("/:id", authMiddleware, uploadPdf.single("pdf"), updateThesis);

// Ver todas las thesis
router.get("/", getAllTheses);

// Ver thesis por institution
router.get("/sub/:idInstitution", getThesesByInstitutionId);

// Ver thesis por ID
router.get("/:id", getThesisById);

// Cambiar status de thesis (aprobación/rechazo, requiere auth)
router.patch("/:id/status", authMiddleware, setThesisStatus);

// Like/Unlike Thesis
router.post("/:id/like", authMiddleware, toggleLikeThesis);

export default router;
