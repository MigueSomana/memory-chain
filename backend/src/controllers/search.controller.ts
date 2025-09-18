import { Request, Response, NextFunction } from 'express';
import { searchTheses } from '../services/thesis.service';
import { searchInstitutions } from '../services/institution.service';

export async function searchAll(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { type } = req.query;
    if (type === 'thesis') {
      const result = await searchTheses(req.query);
      res.json({ success: true, data: result });
      return;
    }
    if (type === 'institution') {
      const result = await searchInstitutions(req.query);
      res.json({ success: true, data: result });
      return;
    }
    res.status(400).json({ success: false, message: 'Invalid search type' });
  } catch (err) {
    next(err);
  }
}
