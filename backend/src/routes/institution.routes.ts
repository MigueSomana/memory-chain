import { Router } from 'express';
import { getInstitutions } from '../controllers/institution.controller';

const router = Router();

router.get('/', getInstitutions);

export default router;
