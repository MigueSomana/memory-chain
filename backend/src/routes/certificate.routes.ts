import { Router } from "express";
import { getThesisCertificate } from "../controllers/certificate.controller";

const router = Router();

// Certificado de una tesis (si no tiene txHash devuelve 404)
router.get("/thesis/:id", getThesisCertificate);

export default router;