import { Request, Response } from 'express';
import { Thesis } from '../models/Thesis';

export async function search(req: Request, res: Response) {
  const { q, author, email, language, degree, workType, institution, department } = req.query as any;
  const filter: any = {};

  if (q) filter.$text = { $search: q };
  if (language) filter.language = language;
  if (degree) filter.degree = degree;
  if (workType) filter.workType = workType;
  if (institution) filter.institution = institution;
  if (department) filter.department = department;
  if (author || email) {
    filter.authors = {};
    if (author) filter['authors.name'] = { $regex: author, $options: 'i' };
    if (email) filter['authors.email'] = email;
  }

  const rows = await Thesis.find(filter).sort({ createdAt: -1 }).limit(100);
  res.json(rows);
}
