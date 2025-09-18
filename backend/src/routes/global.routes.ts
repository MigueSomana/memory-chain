import { Router } from 'express';

// subrutas
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import institutionRoutes from './institution.routes';
import thesisRoutes from './thesis.routes';
import certificationRoutes from './certification.routes';
import searchRoutes from './search.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/institutions', institutionRoutes);
router.use('/theses', thesisRoutes);
router.use('/certifications', certificationRoutes);
router.use('/search', searchRoutes);

export default router;
