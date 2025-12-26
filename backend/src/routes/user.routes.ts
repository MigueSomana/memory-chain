import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import {
  getAllUsers,
  getMe,
  updateMe,
  getMyLikedTheses,
} from "../controllers/user.controller";
import { uploadImage } from "../config/multer";

const router = Router();

router.get("/", authMiddleware, getAllUsers);
router.get("/me", authMiddleware, getMe);

// ✅ multipart: img + fields
router.put("/me", authMiddleware, uploadImage.single("img"), updateMe);

router.get("/me/likes", authMiddleware, getMyLikedTheses);

export default router;
