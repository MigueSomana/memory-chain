import { Router } from 'express';
import { searchAll } from '../controllers/search.controller';

const router = Router();

/**
 * @route GET /search
 * @desc  Búsqueda simple → ?type=thesis|institution&query=...
 */
router.get('/', searchAll);

export default router;
