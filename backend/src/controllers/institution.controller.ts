import { Request, Response } from 'express';
import Institution from '../models/Institution';
import { Types } from 'mongoose';

export async function createInstitution(req: Request, res: Response): Promise<void> {
  try {
    const doc = await Institution.create(req.body);
    res.status(201).json(doc);
  } catch (e: any) {
    console.error('Error creating institution:', e);
    if (e.code === 11000) {
      res.status(400).json({ error: 'Email domain already exists' });
    } else {
      res.status(400).json({ error: e.message });
    }
  }
}

export async function getInstitutions(req: Request, res: Response): Promise<void> {
  try {
    const { q, page = '1', limit = '20' } = req.query as any;
    const p = Math.max(parseInt(page) || 1, 1);
    const l = Math.min(Math.max(parseInt(limit) || 20, 1), 100);

    const filter: any = {};
    if (q) {
      filter.$or = [
        { name: { $regex: q, $options: 'i' } },
        { country: { $regex: q, $options: 'i' } },
        { emailDomain: { $regex: q, $options: 'i' } },
        { 'departments.name': { $regex: q, $options: 'i' } }
      ];
    }

    const [institutions, total] = await Promise.all([
      Institution.find(filter)
        .sort({ name: 1 })
        .skip((p - 1) * l)
        .limit(l),
      Institution.countDocuments(filter)
    ]);

    res.json({
      data: institutions,
      pagination: {
        page: p,
        limit: l,
        total,
        totalPages: Math.ceil(total / l)
      }
    });
  } catch (e: any) {
    console.error('Error getting institutions:', e);
    res.status(500).json({ error: 'Error retrieving institutions', details: e.message });
  }
}

export async function getInstitutionById(req: Request, res: Response): Promise<void> {
  try {
    if (!Types.ObjectId.isValid(req.params.id)) {
      res.status(400).json({ error: 'Invalid institution ID format' });
      return;
    }

    const institution = await Institution.findById(req.params.id);
    if (!institution) {
      res.status(404).json({ error: 'Institution not found' });
      return;
    }

    res.json(institution);
  } catch (e: any) {
    console.error('Error getting institution:', e);
    res.status(500).json({ error: 'Error retrieving institution', details: e.message });
  }
}

export async function updateInstitution(req: Request, res: Response): Promise<void> {
  try {
    if (!Types.ObjectId.isValid(req.params.id)) {
      res.status(400).json({ error: 'Invalid institution ID format' });
      return;
    }

    const institution = await Institution.findByIdAndUpdate(
      req.params.id, 
      req.body, 
      { new: true, runValidators: true }
    );
    
    if (!institution) {
      res.status(404).json({ error: 'Institution not found' });
      return;
    }

    res.json(institution);
  } catch (e: any) {
    console.error('Error updating institution:', e);
    if (e.code === 11000) {
      res.status(400).json({ error: 'Email domain already exists' });
    } else {
      res.status(400).json({ error: e.message });
    }
  }
}

export async function searchInstitutions(req: Request, res: Response): Promise<void> {
  try {
    const { q = '' } = req.query as any;
    
    const filter = q ? {
      $or: [
        { name: { $regex: q, $options: 'i' } },
        { 'departments.name': { $regex: q, $options: 'i' } },
        { country: { $regex: q, $options: 'i' } }
      ]
    } : {};

    const institutions = await Institution.find(filter)
      .sort({ name: 1 })
      .limit(50);
    
    res.json(institutions);
  } catch (e: any) {
    console.error('Error searching institutions:', e);
    res.status(500).json({ error: 'Error searching institutions', details: e.message });
  }
}