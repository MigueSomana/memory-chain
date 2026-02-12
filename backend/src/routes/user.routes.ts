import { Router } from "express";
import {
  getAllUsers,
  getMe,
  updateMe,
  getUserBasicById,
  getMyLikedTheses,setUserEducationalStatus
} from "../controllers/user.controller";
import { authMiddleware } from "../middleware/auth";

// Si tienes multer en middleware para imagen, úsalo aquí.
// Si ya tienes tu uploader, reemplaza el import por el tuyo.
import multer from "multer";
const upload = multer();

const router = Router();

// Listado (si lo quieres público, quita authMiddleware)
router.get("/", authMiddleware, getAllUsers);

// Perfil
router.get("/me", authMiddleware, getMe);
router.put("/me", authMiddleware, upload.single("file"), updateMe);

router.patch("/:id/educational-status", authMiddleware, setUserEducationalStatus);

// Likes del usuario
router.get("/me/liked-theses", authMiddleware, getMyLikedTheses);

// Básico (público)
router.get("/:id/basic", getUserBasicById);

export default router;