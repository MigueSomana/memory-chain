import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import {
  getAllUsers,
  getMe,
  updateMe,
  getMyLikedTheses,
  getUserBasicById,
} from "../controllers/user.controller";
import { uploadImage } from "../config/multer";

const router = Router();

// Lista todos los usuarios (requiere autenticación)
router.get("/", authMiddleware, getAllUsers);

// Obtiene el perfil del usuario autenticado
router.get("/me", authMiddleware, getMe);

// Actualiza el perfil del usuario autenticado (img + campos, multipart/form-data)
router.put("/me", authMiddleware, uploadImage.single("img"), updateMe);

// Devuelve name + lastname de un usuario por ID
router.get("/:id/basic", getUserBasicById);

// Obtiene las tesis a las que el usuario dio like
router.get("/me/likes", authMiddleware, getMyLikedTheses);

export default router;
