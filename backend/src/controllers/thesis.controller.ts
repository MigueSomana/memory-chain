import { Request, Response, NextFunction } from 'express';
import {
  createThesis,
  getByUser,
  getById,
  updateThesis,
  searchTheses,
  attachTxData
} from '../services/thesis.service';

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const thesis = await createThesis({ ...req.body, uploadedBy: req.user._id });
    res.status(201).json({ success: true, data: thesis });
  } catch (err) {
    next(err);
  }
}

export async function getMine(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await getByUser(req.user._id, Number(req.query.page), Number(req.query.limit));
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function getByIdCtrl(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const thesis = await getById(req.params.id);
    if (!thesis) {
      res.status(404).json({ success: false, message: 'Thesis not found' });
      return;
    }
    res.json({ success: true, data: thesis });
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const updated = await updateThesis(req.params.id, req.body);
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}

export async function search(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await searchTheses(req.query);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function attachTx(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const updated = await attachTxData(req.params.id, req.body);
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}
