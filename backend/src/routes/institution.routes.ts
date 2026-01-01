import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import {
  getAllInstitutions,
  getInstitutionById,
  updateInstitution,
  getInstitutionStudents,
  getInstitutionTheses,
} from "../controllers/institution.controller";
import { uploadImage } from "../config/multer";

const router = Router();

// Lista todas las instituciones
router.get("/", getAllInstitutions);

// Obtiene una institución por ID
router.get("/:id", getInstitutionById);

// Obtiene los estudiantes asociados a una institución (requiere auth)
router.get("/:id/students", authMiddleware, getInstitutionStudents);

// Obtiene las tesis de una institución (requiere auth)
router.get("/:id/theses", authMiddleware, getInstitutionTheses);

// Actualiza perfil institucional (logo + campos, multipart/form-data)
router.put(
  "/:id",
  authMiddleware,
  uploadImage.single("logo"),
  updateInstitution
);

export default router;
