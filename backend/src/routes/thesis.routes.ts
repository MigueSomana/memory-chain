import { Router } from "express";
import multer from "multer";
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

const router = Router(); 

const upload = multer({ storage: multer.memoryStorage() });

// ✅ CAMBIADO A "file"
router.post("/", authMiddleware, upload.single("file"), createThesis);

// ✅ PATCH (match con frontend)
router.patch("/:id", authMiddleware, updateThesis);

// ver todas las tesis (ordenable)
router.get("/", getAllTheses);

router.get("/sub/:idInstitution", getThesesByInstitutionId);

// ver tesis específica
router.get("/:id", getThesisById);

// crear tesis (subida de archivo)
router.post("/", authMiddleware, upload.single("file"), createThesis);

// editar tesis propia (sin tocar hash ni status)
router.patch("/:id", authMiddleware, updateThesis);

// institución marca como aprobada / rechazada
router.patch("/:id/status", authMiddleware, setThesisStatus);

// like / unlike
router.post("/:id/like", authMiddleware, toggleLikeThesis);

export default router;
