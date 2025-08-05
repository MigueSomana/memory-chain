import express from 'express';
import { upload } from '../middlewares/upload.middleware';
import * as thesisController from '../controllers/thesis.controller';

const router = express.Router();

router.post('/', thesisController.createThesis);
router.get('/', thesisController.getAllTheses);
router.get('/filter', thesisController.filterTheses);
router.get('/:id', thesisController.getThesisById);
router.put('/:id', thesisController.updateThesis);
router.delete('/:id', thesisController.deleteThesis);
router.post('/upload', upload.single('file'), thesisController.uploadThesisWithFile);


export default router;
