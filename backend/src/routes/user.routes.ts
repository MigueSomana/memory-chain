import express from 'express';
import * as userController from '../controllers/user.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { roleGuard } from '../middlewares/role.guard';
import { validateUser, validateObjectId, validatePagination } from '../middlewares/validation.middleware';

const router = express.Router();

// Todas las rutas de usuarios requieren autenticación
router.use(authMiddleware);

// Solo admins pueden listar todos los usuarios
router.get('/', 
  roleGuard(['admin']),
  validatePagination,
  userController.getAllUsers
);

// Un usuario puede ver su propio perfil, admins pueden ver cualquiera
router.get('/:id', 
  validateObjectId('id'),
  userController.getUserById
);

// Solo admins pueden crear usuarios directamente
router.post('/', 
  roleGuard(['admin']),
  validateUser,
  userController.createUser
);

// Un usuario puede actualizar su propio perfil, admins pueden actualizar cualquiera
router.patch('/:id',
  validateObjectId('id'),
  // validateUser, // Comentado porque necesita lógica especial para updates
  userController.updateUser
);

// Solo admins pueden eliminar usuarios
router.delete('/:id',
  roleGuard(['admin']),
  validateObjectId('id'),
  userController.deleteUser
);

export default router;