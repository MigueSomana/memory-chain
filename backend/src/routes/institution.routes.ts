import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import {
  getAllInstitutions,
  getInstitutionById,
  updateInstitution,
  getInstitutionStudents,
  getInstitutionTheses
} from "../controllers/institution.controller";

const router = Router();

router.get("/", getAllInstitutions);
router.get("/:id", getInstitutionById);

// ver info completa de institución (usuario debe pertenecer a ella)
router.get("/:id/students", authMiddleware, getInstitutionStudents);
router.get("/:id/theses", authMiddleware, getInstitutionTheses);

// editar institución
router.put("/:id", authMiddleware, updateInstitution);

export default router;
