import { Request, Response, NextFunction } from 'express';
import {
  createUser,
  getAllUsers,
  getUserById,
  updateUserById,
  deleteUser,
  addEducationalEmail,
  removeEducationalEmail,
  linkInstitution,
  unlinkInstitution
} from '../services/user.service';

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await createUser(req.body);
    res.status(201).json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
}

export async function getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { page, limit } = req.query;
    const result = await getAllUsers({}, Number(page), Number(limit));
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function getByIdCtrl(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await getUserById(req.params.id);
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }
    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const updated = await updateUserById(req.params.id, req.body);
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const deleted = await deleteUser(req.params.id);
    res.json({ success: true, data: deleted });
  } catch (err) {
    next(err);
  }
}

export async function addEduEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const updated = await addEducationalEmail(req.params.id, req.body.email);
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}

export async function removeEduEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const updated = await removeEducationalEmail(req.params.id, req.body.email);
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}

export async function linkInst(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const updated = await linkInstitution(req.params.id, req.body.institutionId);
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}

export async function unlinkInst(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const updated = await unlinkInstitution(req.params.id, req.body.institutionId);
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}
