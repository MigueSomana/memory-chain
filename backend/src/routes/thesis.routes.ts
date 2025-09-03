import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import { roleGuard } from '../middlewares/role.guard';
import { upload, handleMulterError, validateFileUpload } from '../middlewares/upload.middleware';
import { validateThesis, validateObjectId, validatePagination } from '../middlewares/validation.middleware';
import * as ctrl from '../controllers/thesis.controller';

const router = Router();

// Rutas públicas
router.get('/', 
  validatePagination,
  ctrl.getAllTheses
);

router.get('/:id', 
  validateObjectId('id'),
  ctrl.getThesisById
);

// Rutas protegidas
router.post('/',
  authMiddleware,
  roleGuard(['user', 'institution_admin', 'admin']),
  upload.single('file'),
  handleMulterError,
  validateFileUpload,
  validateThesis,
  ctrl.uploadThesisWithFile
);

export default router;