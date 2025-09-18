import { Router } from 'express';
import {
  create,
  getAll,
  getById,
  update,
  search,
  addDomain,
  removeDomain
} from '../controllers/institution.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { roleGuard } from '../middlewares/role.guard';
import { validateInstitution } from '../middlewares/validation.middleware';

const requireAdmin = [authMiddleware, roleGuard(['admin'])] as const;
const requireAdminOrInstAdmin = [authMiddleware, roleGuard(['admin', 'institution_admin'])] as const;

const router = Router();

/**
 * @route POST /institutions
 * @desc  Crear institución (solo admin)
 */
router.post('/', ...requireAdmin, validateInstitution, create);

/**
 * @route GET /institutions
 * @desc  Listado paginado (público)
 */
router.get('/', getAll);

/**
 * @route GET /institutions/search
 * @desc  Búsqueda (público)
 */
router.get('/search', search);

/**
 * @route GET /institutions/:id
 * @desc  Obtener por id (público)
 */
router.get('/:id', getById);

/**
 * @route PATCH /institutions/:id
 * @desc  Actualizar institución (admin o inst_admin)
 */
router.patch('/:id', ...requireAdminOrInstAdmin, validateInstitution, update);

/**
 * @route POST /institutions/:id/domains
 * @desc  Agregar dominio (admin o inst_admin)
 */
router.post('/:id/domains', ...requireAdminOrInstAdmin, addDomain);

/**
 * @route DELETE /institutions/:id/domains
 * @desc  Quitar dominio (admin o inst_admin)
 */
router.delete('/:id/domains', ...requireAdminOrInstAdmin, removeDomain);

export default router;
