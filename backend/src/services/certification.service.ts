import { Thesis } from '../models/Thesis';
import Institution from '../models/Institution';

export async function requestInstitutionVerification(thesisId: string, institutionId: string) {
  const inst = await Institution.findById(institutionId);
  if (!inst || !inst.isMember || !inst.canVerify) {
    throw new Error('Institution not allowed to verify');
  }
  const thesis = await Thesis.findByIdAndUpdate(thesisId, { status: 'institution_verified' }, { new: true });
  return thesis;
}

export async function certifyThesis(thesisId: string) {
  const thesis = await Thesis.findByIdAndUpdate(thesisId, { status: 'certified' }, { new: true });
  return thesis;
}
