import { Router } from "express";
import { register, registerInstitution, login } from "../controllers/auth.controller";

const router = Router();

// Registro de usuarios normales
router.post("/register", register);

// Registro de instituciones
router.post("/registerinst", registerInstitution);

// Login unificado (usuario o institución)
router.post("/login", login);

export default router;
