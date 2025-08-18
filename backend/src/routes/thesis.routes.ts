import express from 'express';
import { upload, validateFileUpload, handleMulterError } from '../middlewares/upload.middleware';
import { authMiddleware } from '../middlewares/auth.middleware';
import {
  validateThesis,
  validateObjectId,
  validatePagination,
  validateSearchFilters,
  validateUserPermissions
} from '../middlewares/validation.middleware';
import * as thesisController from '../controllers/thesis.controller';

const router = express.Router();
 
// Rutas públicas (sin autenticación)
router.get('/', validatePagination, thesisController.getAllTheses);
router.get('/search', validateSearchFilters, validatePagination, thesisController.searchTheses);
router.get('/stats', thesisController.getThesesStats);
router.get('/verified', validatePagination, thesisController.getVerifiedTheses);
router.get('/:id', validateObjectId('id'), thesisController.getThesisById);

// Rutas protegidas (requieren autenticación)
router.use(authMiddleware);

// Crear tesis (solo datos, sin archivo)
router.post('/', 
  validateUserPermissions(['user', 'institution_admin', 'admin']),
  validateThesis, 
  thesisController.createThesis
);

// Subir tesis con archivo
router.post('/upload',
  validateUserPermissions(['user', 'institution_admin', 'admin']),
  upload.single('file'),
  handleMulterError,
  validateFileUpload,
  validateThesis,
  thesisController.uploadThesisWithFile
);

// Obtener mis tesis
router.get('/user/my-theses', thesisController.getMyTheses);

// Rutas por institución
router.get('/institution/:institutionId', 
  validateObjectId('institutionId'),
  validatePagination,
  thesisController.getThesesByInstitution
);

router.get('/institution/:institutionId/pending',
  validateObjectId('institutionId'),
  validateUserPermissions(['institution_admin', 'admin']),
  thesisController.getPendingTheses
);

// Certificación de tesis
router.post('/:id/certify',
  validateObjectId('id'),
  validateUserPermissions(['institution_admin', 'admin']),
  thesisController.certifyThesis
);

router.delete('/:id/certify',
  validateObjectId('id'),
  validateUserPermissions(['institution_admin', 'admin']),
  thesisController.revokeCertification
);

// Actualizar tesis (solo el autor o admin)
router.put('/:id',
  validateObjectId('id'),
  validateThesis,
  thesisController.updateThesis
);

// Eliminar tesis (solo el autor o admin)
router.delete('/:id',
  validateObjectId('id'),
  validateUserPermissions(['user', 'institution_admin', 'admin']),
  thesisController.deleteThesis
);

// Obtener certificado de autenticidad
router.get('/:id/certificate',
  validateObjectId('id'),
  thesisController.getAuthenticityCertificate
);

// Verificar en blockchain
router.get('/:id/verify-blockchain',
  validateObjectId('id'),
  thesisController.verifyOnBlockchain
);

export default router;