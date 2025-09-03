import { Request, Response } from 'express';
import * as service from '../services/certification.service';
import { Types } from 'mongoose';

export async function verifyByInstitution(req: Request, res: Response): Promise<void> {
  try {
    const { thesisId, institutionId } = req.body;
    
    // Validar ObjectIds
    if (!Types.ObjectId.isValid(thesisId)) {
      res.status(400).json({ error: 'Invalid thesis ID format' });
      return;
    }
    
    if (!Types.ObjectId.isValid(institutionId)) {
      res.status(400).json({ error: 'Invalid institution ID format' });
      return;
    }

    // Verificar que el usuario pertenece a la institución
    const user = req.user;
    if (!user) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const userInstitutions = user.institutions.map((id: Types.ObjectId) => id.toString());
    if (!userInstitutions.includes(institutionId)) {
      res.status(403).json({ 
        error: 'User not authorized for this institution',
        details: 'You can only verify theses for institutions you belong to'
      });
      return;
    }

    const thesis = await service.requestInstitutionVerification(thesisId, institutionId);
    res.json(thesis);
  } catch (e: any) {
    console.error('Verification error:', e);
    res.status(400).json({ error: e.message });
  }
}

export async function certify(req: Request, res: Response): Promise<void> {
  try {
    const { thesisId } = req.body;
    
    if (!Types.ObjectId.isValid(thesisId)) {
      res.status(400).json({ error: 'Invalid thesis ID format' });
      return;
    }

    const thesis = await service.certifyThesis(thesisId);
    if (!thesis) {
      res.status(404).json({ error: 'Thesis not found' });
      return;
    }

    res.json(thesis);
  } catch (e: any) {
    console.error('Certification error:', e);
    res.status(400).json({ error: e.message });
  }
}