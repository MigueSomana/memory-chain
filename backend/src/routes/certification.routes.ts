import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import { roleGuard } from '../middlewares/role.guard';
import * as ctrl from '../controllers/certification.controller';

const router = Router();

router.post('/verify',
  authMiddleware,
  roleGuard(['institution_admin', 'admin']),
  ctrl.verifyByInstitution
);

router.post('/certify',
  authMiddleware,
  roleGuard(['admin']),
  ctrl.certify
);

export default router;
