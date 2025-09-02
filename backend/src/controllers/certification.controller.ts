import { Request, Response } from 'express';
import * as service from '../services/certification.service';

export async function verifyByInstitution(req: Request, res: Response) {
  const { thesisId, institutionId } = req.body;
  try {
    const t = await service.requestInstitutionVerification(thesisId, institutionId);
    res.json(t);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
}

export async function certify(req: Request, res: Response) {
  const { thesisId } = req.body;
  try {
    const t = await service.certifyThesis(thesisId);
    res.json(t);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
}
