import { Router } from "express";
import { getThesisCertificate } from "../controllers/certificate.controller";

const router = Router();

// publico o con auth: tú decides
router.get("/theses/:id/certificate", getThesisCertificate);

export default router;
