import { Request, Response, NextFunction } from 'express';
import { Institution } from '../models/institution.model';

export const getInstitutions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const institutions = await Institution.find();
    return res.json(institutions);
  } catch (error) {
    next(error);
  }
};
