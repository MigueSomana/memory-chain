import { Thesis, IThesis } from '../models/Thesis';
import { Types } from 'mongoose';

export interface PaginationOptions {
  page: number;
  limit: number;
}

export interface ThesesResponse {
  theses: IThesis[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export const createThesis = async (data: Partial<IThesis>): Promise<IThesis> => {
  const thesis = new Thesis(data);
  return (await thesis.save()).populate(['institution', 'uploadedBy', 'verifiedBy']);
};

export const getAllTheses = async (
  filters: any = {}, 
  options: PaginationOptions = { page: 1, limit: 10 }
): Promise<ThesesResponse> => {
  const skip = (options.page - 1) * options.limit;
  
  const [theses, totalCount] = await Promise.all([
    Thesis.find(filters)
      .populate('institution', 'name country emailDomain')
      .populate('uploadedBy', 'name lastname email')
      .populate('verifiedBy', 'name lastname email')
      .sort({ uploadDate: -1 })
      .skip(skip)
      .limit(options.limit),
    Thesis.countDocuments(filters)
  ]);
  
  const totalPages = Math.ceil(totalCount / options.limit);
  
  return {
    theses,
    pagination: {
      currentPage: options.page,
      totalPages,
      totalCount,
      hasNext: options.page < totalPages,
      hasPrev: options.page > 1
    }
  };
};

export const getThesisById = async (id: string): Promise<IThesis | null> => {
  return Thesis.findById(id)
    .populate('institution', 'name country emailDomain type departments')
    .populate('uploadedBy', 'name lastname email role')
    .populate('verifiedBy', 'name lastname email role');
};

export const updateThesis = async (id: string, data: Partial<IThesis>): Promise<IThesis | null> => {
  return Thesis.findByIdAndUpdate(id, data, { new: true })
    .populate(['institution', 'uploadedBy', 'verifiedBy']);
};

export const deleteThesis = async (id: string): Promise<IThesis | null> => {
  return Thesis.findByIdAndDelete(id);
};

export const searchTheses = async (filters: any): Promise<IThesis[]> => {
  const query: any = {};
  
  // Búsqueda por texto (título, resumen, palabras clave)
  if (filters.q) {
    query.$text = { $search: filters.q };
  }
  
  // Filtro por título específico
  if (filters.title) {
    query.title = { $regex: filters.title, $options: 'i' };
  }
  
  // Filtro por idioma
  if (filters.language) {
    query.language = filters.language;
  }
  
  // Filtro por palabra clave específica
  if (filters.keyword) {
    query.keywords = { $in: [new RegExp(filters.keyword, 'i')] };
  }
  
  // Filtro por institución
  if (filters.institution) {
    query.institution = filters.institution;
  }
  
  // Filtro por grado académico
  if (filters.degree) {
    query.degree = filters.degree;
  }
  
  // Filtro por tipo de trabajo
  if (filters.type) {
    query.type = filters.type;
  }
  
  // Filtro por estado de verificación
  if (filters.verified !== undefined) {
    query.isVerifiedByInstitution = filters.verified === 'true';
  }
  
  // Filtro por autor (nombre o email)
  if (filters.author) {
    query.$or = [
      { 'authors.name': { $regex: filters.author, $options: 'i' } },
      { 'authors.email': { $regex: filters.author, $options: 'i' } }
    ];
  }
  
  // Filtro por rango de fechas
  if (filters.dateFrom || filters.dateTo) {
    query.uploadDate = {};
    if (filters.dateFrom) {
      query.uploadDate.$gte = new Date(filters.dateFrom);
    }
    if (filters.dateTo) {
      query.uploadDate.$lte = new Date(filters.dateTo);
    }
  }
  
  // Filtro por hash (IPFS o blockchain)
  if (filters.hash) {
    query.$or = [
      { ipfsHash: filters.hash },
      { blockchainHash: filters.hash }
    ];
  }
  
  return Thesis.find(query)
    .populate('institution', 'name country')
    .populate('uploadedBy', 'name lastname email')
    .sort({ uploadDate: -1 })
    .limit(100); // Limitar resultados para evitar sobrecarga
};

export const getThesesByUploader = async (uploaderId: string): Promise<IThesis[]> => {
  return Thesis.find({ uploadedBy: uploaderId })
    .populate('institution', 'name country')
    .populate('verifiedBy', 'name lastname email')
    .sort({ uploadDate: -1 });
};

export const getThesesByInstitution = async (
  institutionId: string,
  options: PaginationOptions = { page: 1, limit: 10 }
): Promise<ThesesResponse> => {
  const skip = (options.page - 1) * options.limit;
  
  const [theses, totalCount] = await Promise.all([
    Thesis.find({ institution: institutionId })
      .populate('uploadedBy', 'name lastname email')
      .populate('verifiedBy', 'name lastname email')
      .sort({ uploadDate: -1 })
      .skip(skip)
      .limit(options.limit),
    Thesis.countDocuments({ institution: institutionId })
  ]);
  
  const totalPages = Math.ceil(totalCount / options.limit);
  
  return {
    theses,
    pagination: {
      currentPage: options.page,
      totalPages,
      totalCount,
      hasNext: options.page < totalPages,
      hasPrev: options.page > 1
    }
  };
};

export const getVerifiedTheses = async (
  options: PaginationOptions = { page: 1, limit: 10 }
): Promise<ThesesResponse> => {
  return getAllTheses({ isVerifiedByInstitution: true }, options);
};

export const getThesesPendingVerification = async (
  institutionId: string
): Promise<IThesis[]> => {
  return Thesis.find({
    institution: institutionId,
    isVerifiedByInstitution: false
  })
    .populate('uploadedBy', 'name lastname email')
    .sort({ uploadDate: -1 });
};

export const getThesesByAuthorEmail = async (email: string): Promise<IThesis[]> => {
  return Thesis.find({
    'authors.email': { $regex: new RegExp(email, 'i') }
  })
    .populate('institution', 'name country')
    .populate('uploadedBy', 'name lastname email')
    .sort({ uploadDate: -1 });
};

export const getThesesStats = async () => {
  const [
    totalTheses,
    verifiedTheses,
    thesesByLanguage,
    thesesByDegree,
    recentTheses
  ] = await Promise.all([
    Thesis.countDocuments(),
    Thesis.countDocuments({ isVerifiedByInstitution: true }),
    Thesis.aggregate([
      { $group: { _id: '$language', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]),
    Thesis.aggregate([
      { $group: { _id: '$degree', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]),
    Thesis.countDocuments({
      uploadDate: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
    })
  ]);
 
  return {
    total: totalTheses,
    verified: verifiedTheses,
    unverified: totalTheses - verifiedTheses,
    verificationRate: totalTheses > 0 ? ((verifiedTheses / totalTheses) * 100).toFixed(2) : 0,
    byLanguage: thesesByLanguage,
    byDegree: thesesByDegree,
    recentUploads: recentTheses
  };
};

export const searchThesesAdvanced = async (searchParams: {
  query?: string;
  authorName?: string;
  authorEmail?: string;
  institutionName?: string;
  language?: string;
  degree?: string;
  verified?: boolean;
  dateFrom?: Date;
  dateTo?: Date;
  keywords?: string[];
  page?: number;
  limit?: number;
}): Promise<ThesesResponse> => {
  const {
    query,
    authorName,
    authorEmail,
    institutionName,
    language,
    degree,
    verified,
    dateFrom,
    dateTo,
    keywords,
    page = 1,
    limit = 10
  } = searchParams;

  const aggregationPipeline: any[] = [];

  // Match stage
  const matchConditions: any = {};

  // Text search
  if (query) {
    matchConditions.$text = { $search: query };
  }

  // Author filters
  if (authorName) {
    matchConditions['authors.name'] = { $regex: authorName, $options: 'i' };
  }

  if (authorEmail) {
    matchConditions['authors.email'] = { $regex: authorEmail, $options: 'i' };
  }

  // Basic filters
  if (language) matchConditions.language = language;
  if (degree) matchConditions.degree = degree;
  if (verified !== undefined) matchConditions.isVerifiedByInstitution = verified;

  // Date range
  if (dateFrom || dateTo) {
    matchConditions.uploadDate = {};
    if (dateFrom) matchConditions.uploadDate.$gte = dateFrom;
    if (dateTo) matchConditions.uploadDate.$lte = dateTo;
  }

  // Keywords array filter
  if (keywords && keywords.length > 0) {
    matchConditions.keywords = { $in: keywords.map(k => new RegExp(k, 'i')) };
  }

  aggregationPipeline.push({ $match: matchConditions });

  // Lookup institution
  aggregationPipeline.push({
    $lookup: {
      from: 'institutions',
      localField: 'institution',
      foreignField: '_id',
      as: 'institution'
    }
  });

  aggregationPipeline.push({ $unwind: '$institution' });

  // Institution name filter (after lookup)
  if (institutionName) {
    aggregationPipeline.push({
      $match: {
        'institution.name': { $regex: institutionName, $options: 'i' }
      }
    });
  }

  // Sort by relevance or date
  if (query) {
    aggregationPipeline.push({ $sort: { score: { $meta: 'textScore' }, uploadDate: -1 } });
  } else {
    aggregationPipeline.push({ $sort: { uploadDate: -1 } });
  }

  // Count total documents
  const countPipeline = [...aggregationPipeline, { $count: 'total' }];
  const countResult = await Thesis.aggregate(countPipeline);
  const totalCount = countResult[0]?.total || 0;

  // Add pagination
  aggregationPipeline.push({ $skip: (page - 1) * limit });
  aggregationPipeline.push({ $limit: limit });

  // Lookup additional fields
  aggregationPipeline.push({
    $lookup: {
      from: 'users',
      localField: 'uploadedBy',
      foreignField: '_id',
      as: 'uploadedBy',
      pipeline: [{ $project: { name: 1, lastname: 1, email: 1 } }]
    }
  });

  aggregationPipeline.push({
    $lookup: {
      from: 'users',
      localField: 'verifiedBy',
      foreignField: '_id',
      as: 'verifiedBy',
      pipeline: [{ $project: { name: 1, lastname: 1, email: 1 } }]
    }
  });

  aggregationPipeline.push({ $unwind: { path: '$uploadedBy', preserveNullAndEmptyArrays: true } });
  aggregationPipeline.push({ $unwind: { path: '$verifiedBy', preserveNullAndEmptyArrays: true } });

  const theses = await Thesis.aggregate(aggregationPipeline);
  const totalPages = Math.ceil(totalCount / limit);

  return {
    theses,
    pagination: {
      currentPage: page,
      totalPages,
      totalCount,
      hasNext: page < totalPages,
      hasPrev: page > 1
    }
  };
};