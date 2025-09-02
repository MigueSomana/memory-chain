import { Thesis } from '../models/Thesis';
import { Types } from 'mongoose';

export async function getByUser(userId: string, page = 1, limit = 10) {
  const filter = { uploadedBy: new Types.ObjectId(userId) };
  const [rows, total] = await Promise.all([
    Thesis.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    Thesis.countDocuments(filter)
  ]);
  return { rows, total, page, totalPages: Math.ceil(total / limit) };
}
