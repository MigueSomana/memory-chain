import Institution, { InstitutionDocument } from '../models/Institution';

export const createInstitution = async (data: Partial<InstitutionDocument>) => {
  const institution = new Institution(data);
  return await institution.save();
};

export const getAllInstitutions = async () => {
  return await Institution.find();
};

export const getInstitutionById = async (id: string) => {
  return await Institution.findById(id);
};

export const updateInstitutionById = async (
  id: string,
  updates: Partial<InstitutionDocument>
) => {
  return await Institution.findByIdAndUpdate(id, updates, { new: true });
};

export const searchInstitutions = async (query: string) => {
  return await Institution.find({
    $or: [
      { name: { $regex: query, $options: 'i' } },
      { 'departments.name': { $regex: query, $options: 'i' } },
    ],
  });
};
