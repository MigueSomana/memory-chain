import { Request, Response, NextFunction } from 'express';
import {
  createInstitution,
  getAllInstitutions,
  getInstitutionById,
  updateInstitutionById,
  searchInstitutions,
  addEmailDomain,
  removeEmailDomain
} from '../services/institution.service';

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const inst = await createInstitution(req.body);
    res.status(201).json({ success: true, data: inst });
  } catch (err) {
    next(err);
  }
}

export async function getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { page, limit } = req.query;
    const result = await getAllInstitutions({}, Number(page), Number(limit));
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const inst = await getInstitutionById(req.params.id);
    if (!inst) {
      res.status(404).json({ success: false, message: 'Institution not found' });
      return;
    }
    res.json({ success: true, data: inst });
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const updated = await updateInstitutionById(req.params.id, req.body);
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}

export async function search(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await searchInstitutions(req.query);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function addDomain(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const updated = await addEmailDomain(req.params.id, req.body.domain);
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}

export async function removeDomain(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const updated = await removeEmailDomain(req.params.id, req.body.domain);
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}
