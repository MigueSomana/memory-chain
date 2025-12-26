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

router.get("/", getAllInstitutions);
router.get("/:id", getInstitutionById);

router.get("/:id/students", authMiddleware, getInstitutionStudents);
router.get("/:id/theses", authMiddleware, getInstitutionTheses);

// ✅ multipart: logo + fields
router.put("/:id", authMiddleware, uploadImage.single("logo"), updateInstitution);

export default router;
