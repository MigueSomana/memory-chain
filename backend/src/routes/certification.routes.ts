import { Router } from 'express';
import { requestVerification, certify } from '../controllers/certification.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { roleGuard } from '../middlewares/role.guard';

// Política: requestVerification → institution_admin; certify → admin
const requireInstAdmin = [authMiddleware, roleGuard(['institution_admin', 'admin'])] as const;
const requireAdmin = [authMiddleware, roleGuard(['admin'])] as const;

const router = Router();

/**
 * @route POST /certifications/request
 * @desc  Solicitar verificación institucional (inst_admin o admin)
 * body: { thesisId, institutionId }
 */
router.post('/request', ...requireInstAdmin, requestVerification);

/**
 * @route POST /certifications/certify
 * @desc  Certificar tesis (solo admin)
 * body: { thesisId, txHash, chainId?, blockNumber? }
 */
router.post('/certify', ...requireAdmin, certify);

export default router;
