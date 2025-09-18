import { Request, Response, NextFunction } from 'express';
import { requestInstitutionVerification, certifyThesis } from '../services/certification.service';

export async function requestVerification(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { thesisId, institutionId } = req.body;
    const updated = await requestInstitutionVerification(thesisId, institutionId);
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}

export async function certify(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { thesisId, txHash, chainId, blockNumber } = req.body;
    const updated = await certifyThesis(thesisId, { txHash, chainId, blockNumber });
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}
