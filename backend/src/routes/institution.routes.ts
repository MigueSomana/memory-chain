
import express from 'express';
import {
  createInstitution,
  getInstitutions,
  getInstitutionById,
  updateInstitution,
  searchInstitutions,
} from '../controllers/institution.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { roleGuard } from '../middlewares/role.guard';
import { validateInstitution, validateObjectId, validatePagination } from '../middlewares/validation.middleware';

const router = express.Router();

// Rutas públicas
router.get('/', 
  validatePagination,
  getInstitutions
);

router.get('/search', 
  searchInstitutions
);

router.get('/:id', 
  validateObjectId('id'),
  getInstitutionById
);

// Rutas protegidas (solo admins pueden crear/modificar instituciones)
router.post('/', 
  authMiddleware,
  roleGuard(['admin']),
  validateInstitution,
  createInstitution
);

router.patch('/:id',
  authMiddleware,
  roleGuard(['admin', 'institution_admin']),
  validateObjectId('id'),
  validateInstitution,
  updateInstitution
);

export default router;