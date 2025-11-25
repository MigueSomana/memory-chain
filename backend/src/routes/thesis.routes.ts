import { Router } from 'express';
import multer from 'multer';
import { createThesis, getTheses } from '../controllers/thesis.controller';
// import { authMiddleware } from '../middleware/auth.middleware'; // si ya lo tienes

const upload = multer({ storage: multer.memoryStorage() });
const router = Router();

router.get('/', getTheses);

// authMiddleware si quieres que solo logueados suban
router.post('/', upload.single('file'), createThesis);

export default router;
