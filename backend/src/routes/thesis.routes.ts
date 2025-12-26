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
import { uploadPdf } from "../config/multer"; // sigue disponible, pero el archivo es opcional

const router = Router();

// CREAR TESIS (PDF opcional por ahora)
router.post("/", authMiddleware, uploadPdf.single("pdf"), createThesis);

// EDITAR TESIS
router.patch("/:id", authMiddleware, uploadPdf.single("pdf"), updateThesis);

// VER TODAS
router.get("/", getAllTheses);

// POR INSTITUCIÓN
router.get("/sub/:idInstitution", getThesesByInstitutionId);

// VER UNA
router.get("/:id", getThesisById);

// CAMBIAR STATUS
router.patch("/:id/status", authMiddleware, setThesisStatus);

// LIKE
router.post("/:id/like", authMiddleware, toggleLikeThesis);

export default router;
