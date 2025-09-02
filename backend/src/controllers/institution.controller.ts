import { Request, Response } from 'express';
import Institution from '../models/Institution';

export async function createInstitution(req: Request, res: Response) {
  try {
    const doc = await Institution.create(req.body);
    res.status(201).json(doc);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
}

export async function getInstitutions(req: Request, res: Response) {
  const { q } = req.query as any;
  const filter: any = q ? { $or: [
    { name: { $regex: q, $options: 'i' } },
    { country: { $regex: q, $options: 'i' } },
    { emailDomain: { $regex: q, $options: 'i' } },
    { 'departments.name': { $regex: q, $options: 'i' } }
  ] } : {};
  const rows = await Institution.find(filter).sort({ name: 1 });
  res.json(rows);
}

export async function getInstitutionById(req: Request, res: Response) {
  const row = await Institution.findById(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(row);
}

export async function updateInstitution(req: Request, res: Response) {
  const row = await Institution.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(row);
}

export async function searchInstitutions(req: Request, res: Response) {
  const { q = '' } = req.query as any;
  const rows = await Institution.find({
    $or: [
      { name: { $regex: q, $options: 'i' } },
      { 'departments.name': { $regex: q, $options: 'i' } }
    ]
  }).limit(50);
  res.json(rows);
}
