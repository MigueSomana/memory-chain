import { Request, Response, NextFunction } from 'express';
import { validateUserData, validateInstitutionData, validateThesisData } from '../services/validation.service';

export async function validateUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const r = await validateUserData({ ...req.body, idForUpdate: req.params.id });
    if (!r.isValid) {
      res.status(400).json({ success: false, errors: r.errors });
      return;
    }
    next();
  } catch (err) {
    next(err);
  }
}

export async function validateInstitution(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const r = await validateInstitutionData(req.body);
    if (!r.isValid) {
      res.status(400).json({ success: false, errors: r.errors });
      return;
    }
    next();
  } catch (err) {
    next(err);
  }
}

export async function validateThesis(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const r = await validateThesisData(req.body);
    if (!r.isValid) {
      res.status(400).json({ success: false, errors: r.errors });
      return;
    }
    next();
  } catch (err) {
    next(err);
  }
}
