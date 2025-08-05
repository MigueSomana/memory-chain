import { Thesis, IThesis } from '../models/Thesis';

export const createThesis = async (data: Partial<IThesis>) => {
  const thesis = new Thesis(data);
  return thesis.save();
};

export const getAllTheses = async () => {
  return Thesis.find().populate('institution');
};

export const getThesisById = async (id: string) => {
  return Thesis.findById(id).populate('institution');
};

export const updateThesis = async (id: string, data: Partial<IThesis>) => {
  return Thesis.findByIdAndUpdate(id, data, { new: true }).populate('institution');
};

export const deleteThesis = async (id: string) => {
  return Thesis.findByIdAndDelete(id);
};

export const filterTheses = async (filters: any) => {
  const query: any = {};

  if (filters.title) {
    query.title = { $regex: filters.title, $options: 'i' };
  }

  if (filters.language) {
    query.language = filters.language;
  }

  if (filters.keyword) {
    query.keywords = { $in: [filters.keyword] };
  }

  if (filters.institution) {
    query.institution = filters.institution;
  }

  return Thesis.find(query).populate('institution');
};
