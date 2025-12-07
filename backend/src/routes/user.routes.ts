import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import {
  getAllUsers,
  getMe,
  updateMe,
  getMyLikedTheses
} from "../controllers/user.controller";

const router = Router();

// ver todos los usuarios (sin password)
router.get("/", authMiddleware, getAllUsers);

// info del usuario logueado
router.get("/me", authMiddleware, getMe);

// editar usuario logueado
router.put("/me", authMiddleware, updateMe);

// tesis que le ha dado like
router.get("/me/likes", authMiddleware, getMyLikedTheses);

export default router;
