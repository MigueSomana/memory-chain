import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import { roleGuard } from '../middlewares/role.guard';
import { upload, handleMulterError, validateFileUpload } from '../middlewares/upload.middleware';
import * as ctrl from '../controllers/thesis.controller';

const router = Router();

// Públicos
router.get('/', ctrl.getAllTheses);
router.get('/:id', ctrl.getThesisById);

// Protegidos
router.post(
  '/',
  authMiddleware,
  roleGuard(['user', 'institution_admin', 'admin']),
  upload.single('file'),
  handleMulterError,
  validateFileUpload,
  ctrl.uploadThesisWithFile
);

export default router;
