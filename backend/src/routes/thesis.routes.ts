import { Router } from "express";
import {
  getAllTheses,
  getThesisById,
  getThesesByInstitutionId,
  createThesis,
  updateThesis,
  setThesisStatus,
  toggleLikeThesis,
  incrementQuoteThesis,
} from "../controllers/thesis.controller";

import { authMiddleware } from "../middleware/auth";

// Si ya tienes tu middleware de PDF, reemplázalo.
// Este fallback usa multer memory storage.
import multer from "multer";
const upload = multer();

const router = Router();

// Públicos
router.get("/", getAllTheses);
router.get("/institution/:idInstitution", getThesesByInstitutionId);
router.get("/:id", getThesisById);

// Crear / Editar (requiere USER + PDF opcional en update)
router.post("/", authMiddleware, upload.single("file"), createThesis);
router.patch("/:id", authMiddleware, upload.single("file"), updateThesis);

// Cambiar status (certificar/rechazar) (USER miembro o INSTITUTION)
router.patch("/:id/status", authMiddleware, setThesisStatus);

// Likes (USER)
router.post("/:id/like", authMiddleware, toggleLikeThesis);

// Quotes (público o protegido, tú decides)
router.post("/:id/quote", incrementQuoteThesis);

export default router;