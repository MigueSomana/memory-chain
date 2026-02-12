import { Router } from "express";
import {
  getAllInstitutions,
  getInstitutionById,
  updateInstitution,
  getInstitutionStudents,
  getInstitutionTheses,
  setStudentInstitutionStatus,
} from "../controllers/institution.controller";
import { authMiddleware } from "../middleware/auth";

// Si ya tienes uploader propio, usa el tuyo.
// Este es un fallback simple.
import multer from "multer";
const upload = multer();

const router = Router();

// Públicos
router.get("/", getAllInstitutions);
router.get("/:id", getInstitutionById);
router.get("/:id/students", getInstitutionStudents);
router.get("/:id/theses", getInstitutionTheses);

// Update perfil institución (auth requerido)
router.put("/:id", authMiddleware, upload.single("file"), updateInstitution);

/**
 * ✅ NUEVO: institución aprueba/rechaza estudiantes (educationalEmails.status)
 * Auth requerido (INSTITUTION)
 * Body: { userId, status, email?, institutionKey? }
 */
router.patch("/:id/students/status", authMiddleware, setStudentInstitutionStatus);

export default router;