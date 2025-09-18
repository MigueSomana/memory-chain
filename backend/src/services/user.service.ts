import { FilterQuery, Types } from 'mongoose';
import { User, IUser, UserRole } from '../models/User';
import { Institution, IInstitution } from '../models/Institution';

type Paginated<T> = {
  rows: T[];
  total: number;
  page: number;
  totalPages: number;
};

function sanitizePage(page = 1) { return page < 1 ? 1 : page; }
function sanitizeLimit(limit = 10) { return Math.min(Math.max(limit, 1), 100); }

export async function createUser(data: Partial<IUser>) {
  // Unicidad de email
  if (data.email) {
    const exists = await User.exists({ email: data.email.toLowerCase() });
    if (exists) throw new Error('Email is already in use');
  }
  // Validar instituciones si vienen
  if (data.institutions?.length) {
    const valid = await Institution.countDocuments({ _id: { $in: data.institutions } });
    if (valid !== data.institutions.length) throw new Error('One or more institutions not found');
  }
  const user = new User(data);
  return await user.save();
}

export async function getAllUsers(filter: FilterQuery<IUser> = {}, page = 1, limit = 10): Promise<Paginated<IUser>> {
  page = sanitizePage(page); limit = sanitizeLimit(limit);
  const q = { ...filter } as FilterQuery<IUser>;
  const [rows, total] = await Promise.all([
    User.find(q)
      .select('-password')
      .populate('institutions', 'name emailDomains country')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    User.countDocuments(q),
  ]);
  return { rows, total, page, totalPages: Math.ceil(total / limit) };
}

export async function getUserById(id: string) {
  if (!Types.ObjectId.isValid(id)) throw new Error('Invalid user id');
  return await User.findById(id)
    .select('-password')
    .populate('institutions', 'name emailDomains country');
}

export async function updateUserById(id: string, data: Partial<IUser>) {
  if (!Types.ObjectId.isValid(id)) throw new Error('Invalid user id');

  if (data.email) {
    const taken = await User.exists({ _id: { $ne: id }, email: data.email.toLowerCase() });
    if (taken) throw new Error('Email is already in use by another account');
  }
  if (data.institutions?.length) {
    const valid = await Institution.countDocuments({ _id: { $in: data.institutions } });
    if (valid !== data.institutions.length) throw new Error('One or more institutions not found');
  }

  const updated = await User.findByIdAndUpdate(
    id,
    data,
    { new: true, runValidators: true }
  )
    .select('-password')
    .populate('institutions', 'name emailDomains country');

  return updated;
}

export async function deleteUser(id: string) {
  if (!Types.ObjectId.isValid(id)) throw new Error('Invalid user id');
  return await User.findByIdAndDelete(id);
}

export async function findUserByEmail(email: string, opts: { includePassword?: boolean } = {}) {
  const q = User.findOne({ email: email.toLowerCase() }).populate('institutions', 'name emailDomains country');
  if (opts.includePassword) return q.select('+password');
  return q.select('-password');
}

export async function addEducationalEmail(userId: string, newEmail: string) {
  if (!Types.ObjectId.isValid(userId)) throw new Error('Invalid user id');
  const email = newEmail.toLowerCase();
  const updated = await User.findByIdAndUpdate(
    userId,
    { $addToSet: { educationalEmails: email } },
    { new: true, runValidators: true }
  ).select('-password');
  return updated;
}

export async function removeEducationalEmail(userId: string, emailToRemove: string) {
  if (!Types.ObjectId.isValid(userId)) throw new Error('Invalid user id');
  const updated = await User.findByIdAndUpdate(
    userId,
    { $pull: { educationalEmails: emailToRemove.toLowerCase() } },
    { new: true, runValidators: true }
  ).select('-password');
  return updated;
}

export async function linkInstitution(userId: string, institutionId: string) {
  if (!Types.ObjectId.isValid(userId)) throw new Error('Invalid user id');
  if (!Types.ObjectId.isValid(institutionId)) throw new Error('Invalid institution id');
  const inst = await Institution.exists({ _id: institutionId });
  if (!inst) throw new Error('Institution not found');
  const updated = await User.findByIdAndUpdate(
    userId,
    { $addToSet: { institutions: new Types.ObjectId(institutionId) } },
    { new: true, runValidators: true }
  ).select('-password').populate('institutions', 'name emailDomains country');
  return updated;
}

export async function unlinkInstitution(userId: string, institutionId: string) {
  if (!Types.ObjectId.isValid(userId)) throw new Error('Invalid user id');
  if (!Types.ObjectId.isValid(institutionId)) throw new Error('Invalid institution id');
  const updated = await User.findByIdAndUpdate(
    userId,
    { $pull: { institutions: new Types.ObjectId(institutionId) } },
    { new: true, runValidators: true }
  ).select('-password').populate('institutions', 'name emailDomains country');
  return updated;
}
