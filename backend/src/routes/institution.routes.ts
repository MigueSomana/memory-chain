import express from 'express';
import {
  createInstitution,
  getInstitutions,
  getInstitutionById,
  updateInstitution,
  searchInstitutions,
} from '../controllers/institution.controller';

const router = express.Router();

router.post('/', createInstitution);
router.get('/', getInstitutions);
router.get('/search', searchInstitutions); // ?q=nombre_o_carrera
router.get('/:id', getInstitutionById);
router.put('/:id', updateInstitution);

export default router;
