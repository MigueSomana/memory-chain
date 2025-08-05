import { Request, Response } from 'express';
import Institution from '../models/Institution';

// ✅ Crear nueva institución
export const createInstitution = async (req: Request, res: Response) => {
  try {
    const institution = new Institution(req.body);
    const saved = await institution.save();
    res.status(201).json(saved);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};

// ✅ Obtener todas las instituciones
export const getInstitutions = async (_req: Request, res: Response) => {
  try {
    const institutions = await Institution.find();
    res.json(institutions);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// ✅ Buscar institución por ID
export const getInstitutionById = async (req: Request, res: Response) => {
  try {
    const institution = await Institution.findById(req.params.id);
    if (!institution) return res.status(404).json({ error: 'Not found' });
    res.json(institution);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};

// ✅ Actualizar institución
export const updateInstitution = async (req: Request, res: Response) => {
  try {
    const updated = await Institution.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!updated) return res.status(404).json({ error: 'Not found' });
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};

// ✅ Búsqueda por nombre o carrera (AJAX-ready)
export const searchInstitutions = async (req: Request, res: Response) => {
  const { q } = req.query;
  try {
    const results = await Institution.find({
      $or: [
        { name: { $regex: q, $options: 'i' } },
        { 'careers.name': { $regex: q, $options: 'i' } },
      ],
    });
    res.json(results);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};
