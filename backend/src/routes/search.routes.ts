import { Router } from 'express';
import * as ctrl from '../controllers/search.controller';
import { validateThesis, validatePagination } from '../middlewares/validation.middleware';

const router = Router();

router.get('/', validatePagination, validateThesis, ctrl.search);

export default router;