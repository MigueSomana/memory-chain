import mongoose from 'mongoose';
import { Thesis } from '../models/Thesis';
import { Institution } from '../models/Institution';

/**
 * Solicita verificación institucional de una tesis.
 * Requisitos:
 *  - La institución existe, es miembro y puede verificar.
 *  - La tesis existe y está 'published' (o 'draft' si quieres permitir transición directa).
 * Transición: 'published' -> 'institution_verified'
 */
export async function requestInstitutionVerification(thesisId: string, institutionId: string) {
  if (!mongoose.Types.ObjectId.isValid(thesisId)) throw new Error('Invalid thesis id');
  if (!mongoose.Types.ObjectId.isValid(institutionId)) throw new Error('Invalid institution id');

  const [inst, thesis] = await Promise.all([
    Institution.findById(institutionId).select('isMember canVerify'),
    Thesis.findById(thesisId).select('status institution'),
  ]);

  if (!inst || !inst.isMember || !inst.canVerify) {
    throw new Error('Institution not allowed to verify');
  }
  if (!thesis) throw new Error('Thesis not found');
  if (String(thesis.institution) !== String(institutionId)) {
    // Por política, solo la institución propietaria puede verificar
    throw new Error('Only the owning institution can verify this thesis');
  }
  if (thesis.status === 'certified') return thesis; // idempotencia
  if (thesis.status !== 'published') {
    throw new Error(`Thesis status must be 'published' to be institution verified (current: ${thesis.status})`);
  }

  const updated = await Thesis.findByIdAndUpdate(
    thesisId,
    { status: 'institution_verified' },
    { new: true }
  );
  return updated;
}

/**
 * Certifica una tesis con datos on-chain. Requiere que ya esté 'institution_verified'.
 * Transición: 'institution_verified' -> 'certified'
 */
export async function certifyThesis(thesisId: string, tx: { txHash: string; chainId?: number; blockNumber?: number }) {
  if (!mongoose.Types.ObjectId.isValid(thesisId)) throw new Error('Invalid thesis id');
  if (!tx?.txHash) throw new Error('txHash is required');

  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const thesis = await Thesis.findById(thesisId).session(session);
    if (!thesis) throw new Error('Thesis not found');
    if (thesis.status === 'certified') {
      await session.commitTransaction();
      return thesis; // idempotencia
    }
    if (thesis.status !== 'institution_verified') {
      throw new Error(`Thesis status must be 'institution_verified' to certify (current: ${thesis.status})`);
    }

    thesis.txHash = tx.txHash;
    if (typeof tx.chainId === 'number') thesis.chainId = tx.chainId;
    if (typeof tx.blockNumber === 'number') thesis.blockNumber = tx.blockNumber;
    thesis.status = 'certified';

    await thesis.save({ session });
    await session.commitTransaction();
    return thesis;
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
}
