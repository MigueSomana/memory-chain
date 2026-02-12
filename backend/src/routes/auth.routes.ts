import { Router } from "express";
import {
  login,
  register,
  registerInstitution,
} from "../controllers/auth.controller";

const router = Router();

// User
router.post("/register", register);
router.post("/login", login);

// Institution
router.post("/register-institution", registerInstitution);

export default router;