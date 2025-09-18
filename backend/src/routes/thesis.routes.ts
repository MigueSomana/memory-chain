import { Router } from 'express';
import {
  create,
  getMine,
  getByIdCtrl,
  update,
  search,
  attachTx
} from '../controllers/thesis.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { roleGuard } from '../middlewares/role.guard';
import { validateThesis } from '../middlewares/validation.middleware';

// Reglas base: crear/editar requiere estar autenticado
const requireAuth = [authMiddleware] as const;
// attachTx y ciertas acciones podrían ser admin o inst_admin
const requireAdminOrInstAdmin = [authMiddleware, roleGuard(['admin', 'institution_admin'])] as const;

const router = Router();

/**
 * @route POST /theses
 * @desc  Crear tesis (auth)
 */
router.post('/', ...requireAuth, validateThesis, create);

/**
 * @route GET /theses/mine
 * @desc  Mis tesis (auth)
 */
router.get('/mine', ...requireAuth, getMine);

/**
 * @route GET /theses/search
 * @desc  Buscar tesis (público)
 */
router.get('/search', search);

/**
 * @route GET /theses/:id
 * @desc  Ver tesis por id (público)
 */
router.get('/:id', getByIdCtrl);

/**
 * @route PATCH /theses/:id
 * @desc  Actualizar tesis (auth). Nota: certificación se hace en certification.routes
 */
router.patch('/:id', ...requireAuth, validateThesis, update);

/**
 * @route POST /theses/:id/tx
 * @desc  Adjuntar datos on-chain (admin o inst_admin)
 */
router.post('/:id/tx', ...requireAdminOrInstAdmin, attachTx);

export default router;
