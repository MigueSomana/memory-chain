import { FilterQuery, Types } from 'mongoose';
import { Institution, IInstitution } from '../models/Institution';

type Paginated<T> = {
  rows: T[];
  total: number;
  page: number;
  totalPages: number;
};

function sanitizePage(page = 1) { return page < 1 ? 1 : page; }
function sanitizeLimit(limit = 10) { return Math.min(Math.max(limit, 1), 100); }

export async function createInstitution(data: Partial<IInstitution>) {
  // Normalizar dominios
  if (data.emailDomain && (!data.emailDomains || data.emailDomains.length === 0)) {
    data.emailDomains = [data.emailDomain];
  }
  const inst = new Institution(data);
  return await inst.save();
}

export async function getAllInstitutions(
  filter: FilterQuery<IInstitution> = {},
  page = 1,
  limit = 10
): Promise<Paginated<IInstitution>> {
  page = sanitizePage(page); limit = sanitizeLimit(limit);
  const [rows, total] = await Promise.all([
    Institution.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Institution.countDocuments(filter),
  ]);
  return { rows, total, page, totalPages: Math.ceil(total / limit) };
}

export async function getInstitutionById(id: string) {
  if (!Types.ObjectId.isValid(id)) throw new Error('Invalid institution id');
  return await Institution.findById(id);
}

export async function updateInstitutionById(id: string, updates: Partial<IInstitution>) {
  if (!Types.ObjectId.isValid(id)) throw new Error('Invalid institution id');
  // Si llega emailDomain solo, preserva compatibilidad
  if (updates.emailDomain) {
    updates.emailDomains = Array.from(new Set([...(updates.emailDomains || []), updates.emailDomain]));
  }
  return await Institution.findByIdAndUpdate(id, updates, { new: true, runValidators: true });
}

export async function searchInstitutions(q: {
  query?: string;
  country?: string;
  type?: 'public' | 'private' | 'hybrid';
  isMember?: boolean;
  canVerify?: boolean;
  page?: number;
  limit?: number;
} = {}) {
  const filter: FilterQuery<IInstitution> = {};
  if (q.country) filter.country = q.country;
  if (q.type) filter.type = q.type;
  if (typeof q.isMember === 'boolean') filter.isMember = q.isMember;
  if (typeof q.canVerify === 'boolean') filter.canVerify = q.canVerify;
  if (q.query) {
    filter.$or = [
      { name: { $regex: q.query, $options: 'i' } },
      { 'departments.name': { $regex: q.query, $options: 'i' } },
    ];
  }
  return await getAllInstitutions(filter, q.page ?? 1, q.limit ?? 10);
}

export async function addEmailDomain(institutionId: string, domain: string) {
  if (!Types.ObjectId.isValid(institutionId)) throw new Error('Invalid institution id');
  return await Institution.findByIdAndUpdate(
    institutionId,
    { $addToSet: { emailDomains: domain.toLowerCase() } },
    { new: true, runValidators: true }
  );
}

export async function removeEmailDomain(institutionId: string, domain: string) {
  if (!Types.ObjectId.isValid(institutionId)) throw new Error('Invalid institution id');
  return await Institution.findByIdAndUpdate(
    institutionId,
    { $pull: { emailDomains: domain.toLowerCase() } },
    { new: true, runValidators: true }
  );
}

export async function canInstitutionVerify(institutionId: string) {
  if (!Types.ObjectId.isValid(institutionId)) return false;
  const inst = await Institution.findById(institutionId).select('isMember canVerify');
  return !!inst && inst.isMember && inst.canVerify;
}
