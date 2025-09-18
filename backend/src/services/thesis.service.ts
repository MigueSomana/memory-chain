import { FilterQuery, Types } from 'mongoose';
import { Thesis, IThesis } from '../models/Thesis';
import { Institution } from '../models/Institution';

type Paginated<T> = {
  rows: T[];
  total: number;
  page: number;
  totalPages: number;
};

function sanitizePage(page = 1) { return page < 1 ? 1 : page; }
function sanitizeLimit(limit = 10) { return Math.min(Math.max(limit, 1), 100); }

export async function createThesis(data: Partial<IThesis>) {
  if (!data.title) throw new Error('title is required');
  if (!data.authors || data.authors.length === 0) throw new Error('authors is required');
  if (!data.summary) throw new Error('summary is required');
  if (!data.language) throw new Error('language is required');
  if (!data.degree) throw new Error('degree is required');
  if (!data.institution) throw new Error('institution is required');
  if (!data.fileHash) throw new Error('fileHash is required');
  if (!data.ipfsCid) throw new Error('ipfsCid is required');

  if (!Types.ObjectId.isValid(String(data.institution))) throw new Error('Invalid institution id');
  const instExists = await Institution.exists({ _id: data.institution });
  if (!instExists) throw new Error('Institution not found');

  const thesis = new Thesis(data);
  return await thesis.save();
}

export async function getByUser(userId: string, page = 1, limit = 10): Promise<Paginated<IThesis>> {
  if (!Types.ObjectId.isValid(userId)) throw new Error('Invalid user id');
  page = sanitizePage(page); limit = sanitizeLimit(limit);
  const filter = { uploadedBy: new Types.ObjectId(userId) } as FilterQuery<IThesis>;
  const [rows, total] = await Promise.all([
    Thesis.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    Thesis.countDocuments(filter),
  ]);
  return { rows, total, page, totalPages: Math.ceil(total / limit) };
}

export async function getById(thesisId: string) {
  if (!Types.ObjectId.isValid(thesisId)) throw new Error('Invalid thesis id');
  return await Thesis.findById(thesisId)
    .populate('institution', 'name country')
    .populate('uploadedBy', 'name email');
}

export async function updateThesis(thesisId: string, updates: Partial<IThesis>) {
  if (!Types.ObjectId.isValid(thesisId)) throw new Error('Invalid thesis id');

  // No permitir cambiar estado a 'certified' aquí; use certification.service
  if (updates.status === 'certified') {
    throw new Error('Use certification service to certify thesis');
  }
  if (updates.institution && !Types.ObjectId.isValid(String(updates.institution))) {
    throw new Error('Invalid institution id');
  }

  const updated = await Thesis.findByIdAndUpdate(
    thesisId,
    updates,
    { new: true, runValidators: true }
  );
  return updated;
}

export async function searchTheses(q: {
  query?: string;
  author?: string;
  institution?: string;
  yearFrom?: number;
  yearTo?: number;
  degree?: string;
  status?: 'draft' | 'published' | 'institution_verified' | 'certified';
  page?: number;
  limit?: number;
} = {}) {
  const filter: FilterQuery<IThesis> = {};
  if (q.query) {
    filter.$text = { $search: q.query };
  }
  if (q.author) {
    filter['authors.name'] = { $regex: q.author, $options: 'i' };
  }
  if (q.institution) {
    if (!Types.ObjectId.isValid(q.institution)) throw new Error('Invalid institution id');
    filter.institution = new Types.ObjectId(q.institution);
  }
  if (q.yearFrom || q.yearTo) {
    filter.year = {};
    if (q.yearFrom) filter.year.$gte = q.yearFrom;
    if (q.yearTo) filter.year.$lte = q.yearTo;
  }
  if (q.degree) filter.degree = { $regex: q.degree, $options: 'i' };
  if (q.status) filter.status = q.status;

  const page = sanitizePage(q.page ?? 1);
  const limit = sanitizeLimit(q.limit ?? 10);

  const [rows, total] = await Promise.all([
    Thesis.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Thesis.countDocuments(filter),
  ]);

  return { rows, total, page, totalPages: Math.ceil(total / limit) };
}

export async function attachTxData(thesisId: string, tx: { txHash: string; chainId?: number; blockNumber?: number; }) {
  if (!Types.ObjectId.isValid(thesisId)) throw new Error('Invalid thesis id');
  const updated = await Thesis.findByIdAndUpdate(
    thesisId,
    { $set: { txHash: tx.txHash, chainId: tx.chainId, blockNumber: tx.blockNumber } },
    { new: true, runValidators: true }
  );
  return updated;
}
