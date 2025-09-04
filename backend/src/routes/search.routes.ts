import { Router } from 'express';
import * as ctrl from '../controllers/search.controller';
import { validatePagination } from '../middlewares/validation.middleware';

const router = Router();

// Solo validar paginación en búsquedas, no datos de tesis
router.get('/', validatePagination, ctrl.search);

export default router;