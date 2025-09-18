import { Router } from 'express';
import { login, me } from '../controllers/auth.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

/**
 * @route POST /auth/login
 * @desc  Login y devolución de JWT + usuario
 */
router.post('/login', login);

/**
 * @route GET /auth/me
 * @desc  Devuelve el usuario autenticado
 */
router.get('/me', authMiddleware, me);

export default router;
