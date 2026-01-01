import { Router } from "express";
import { getThesisCertificate } from "../controllers/certificate.controller";

const router = Router();

// Obtiene el certificado de una tesis publico
router.get("/theses/:id/certificate", getThesisCertificate);

export default router;
