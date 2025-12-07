import { Router } from "express";
import { register, registerInstitution, login } from "../controllers/auth.controller";

const router = Router();

router.post("/register", register);
router.post("/register/i", registerInstitution);
router.post("/login", login);

export default router;
