import { Request, Response } from 'express';
import { Thesis } from '../models/Thesis';
import Institution from '../models/Institution';
import { Types } from 'mongoose';

export async function search(req: Request, res: Response): Promise<void> {
  try {
    const { 
      q, 
      author, 
      email, 
      language, 
      degree, 
      workType, 
      institution, 
      department,
      page = '1',
      limit = '10'
    } = req.query as any;

    const p = Math.max(parseInt(page) || 1, 1);
    const l = Math.min(Math.max(parseInt(limit) || 10, 1), 50);

    const filter: any = {};

    // Búsqueda de texto general
    if (q) {
      filter.$text = { $search: q };
    }

    // Filtros específicos
    if (language) filter.language = language;
    if (degree) filter.degree = degree;
    if (workType) filter.workType = workType;
    if (department) filter.department = { $regex: department, $options: 'i' };
    
    // Filtro por institución
    if (institution) {
      if (Types.ObjectId.isValid(institution)) {
        filter.institution = new Types.ObjectId(institution);
      } else {
        // Buscar por nombre de institución si no es ObjectId válido
        const inst = await Institution.findOne({ 
          name: { $regex: institution, $options: 'i' } 
        });
        if (inst) {
          filter.institution = inst._id;
        } else {
          // Si no encuentra institución, devolver array vacío
          res.json({
            data: [],
            pagination: { page: p, limit: l, total: 0, totalPages: 0 }
          });
          return;
        }
      }
    }

    // Filtros por autor
    if (author || email) {
      const authorFilter: any = {};
      if (author) authorFilter['authors.name'] = { $regex: author, $options: 'i' };
      if (email) authorFilter['authors.email'] = { $regex: email, $options: 'i' };
      
      // Combinar filtros de autor
      if (author && email) {
        filter.$and = [
          { 'authors.name': { $regex: author, $options: 'i' } },
          { 'authors.email': { $regex: email, $options: 'i' } }
        ];
      } else {
        Object.assign(filter, authorFilter);
      }
    }

    const [theses, total] = await Promise.all([
      Thesis.find(filter)
        .sort({ createdAt: -1 })
        .skip((p - 1) * l)
        .limit(l)
        .populate('institution', 'name emailDomain country')
        .populate('uploadedBy', 'name lastname email'),
      Thesis.countDocuments(filter)
    ]);

    res.json({
      data: theses,
      pagination: {
        page: p,
        limit: l,
        total,
        totalPages: Math.ceil(total / l)
      },
      filters: {
        q, author, email, language, degree, workType, institution, department
      }
    });
  } catch (e: any) {
    console.error('Search error:', e);
    res.status(500).json({ error: 'Search error', details: e.message });
  }
}