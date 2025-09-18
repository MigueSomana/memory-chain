import { Router } from 'express';
import {
  create,
  getAll,
  getByIdCtrl,
  update,
  remove,
  addEduEmail,
  removeEduEmail,
  linkInst,
  unlinkInst
} from '../controllers/user.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { roleGuard } from '../middlewares/role.guard';
import { validateUser } from '../middlewares/validation.middleware';

// Políticas base (ajústalas a tu negocio)
const requireAdmin = [authMiddleware, roleGuard(['admin'])] as const;
const requireAdminOrInstAdmin = [authMiddleware, roleGuard(['admin', 'institution_admin'])] as const;

const router = Router();

/**
 * @route POST /users
 * @desc  Registro público de usuario (si quieres restringir, agrega auth/role)
 */
router.post('/', validateUser, create);

/**
 * @route GET /users
 * @desc  Listado paginado (solo admin)
 */
router.get('/', ...requireAdmin, getAll);

/**
 * @route GET /users/:id
 * @desc  Ver usuario (admin o inst_admin; si quieres permitir self-view, crea endpoint /me)
 */
router.get('/:id', ...requireAdminOrInstAdmin, getByIdCtrl);

/**
 * @route PATCH /users/:id
 * @desc  Actualizar usuario (admin o inst_admin)
 */
router.patch('/:id', ...requireAdminOrInstAdmin, validateUser, update);

/**
 * @route DELETE /users/:id
 * @desc  Eliminar usuario (solo admin)
 */
router.delete('/:id', ...requireAdmin, remove);

/**
 * @route POST /users/:id/edu-emails
 * @desc  Agrega correo educativo (admin o inst_admin)
 */
router.post('/:id/edu-emails', ...requireAdminOrInstAdmin, addEduEmail);

/**
 * @route DELETE /users/:id/edu-emails
 * @desc  Quita correo educativo (admin o inst_admin)
 */
router.delete('/:id/edu-emails', ...requireAdminOrInstAdmin, removeEduEmail);

/**
 * @route POST /users/:id/link-institution
 * @desc  Vincular institución (admin o inst_admin)
 */
router.post('/:id/link-institution', ...requireAdminOrInstAdmin, linkInst);

/**
 * @route POST /users/:id/unlink-institution
 * @desc  Desvincular institución (admin o inst_admin)
 */
router.post('/:id/unlink-institution', ...requireAdminOrInstAdmin, unlinkInst);

export default router;
