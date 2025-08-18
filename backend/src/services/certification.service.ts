import { User } from '../models/User';
import { Thesis } from '../models/Thesis';
import Institution from '../models/Institution';
import { Types } from 'mongoose';

export interface CertificationResult {
  canCertify: boolean;
  reason?: string;
  institutionName?: string;
}

/**
 * Verifica si un usuario puede certificar una tesis
 */
export const canUserCertifyThesis = async (
  userId: string, 
  thesisId: string
): Promise<CertificationResult> => {
  try {
    const user = await User.findById(userId).populate('institutions');
    const thesis = await Thesis.findById(thesisId).populate('institution');
    
    if (!user || !thesis) {
      return { canCertify: false, reason: 'User or thesis not found' };
    }

    // El usuario debe estar asociado a la institución de la tesis
    const userInstitutionIds = user.institutions.map(inst => inst.toString());
    const thesisInstitutionId = thesis.institution._id.toString();
    
    if (!userInstitutionIds.includes(thesisInstitutionId)) {
      return { 
        canCertify: false, 
        reason: 'User not associated with thesis institution' 
      };
    }

    // La institución debe ser miembro activo
    const institution = await Institution.findById(thesisInstitutionId);
    if (!institution) {
      return { canCertify: false, reason: 'Institution not found' };
    }

    if (!institution.isMember) {
      return { 
        canCertify: false, 
        reason: 'Institution is not an active member',
        institutionName: institution.name 
      };
    }

    if (!institution.canVerify) {
      return { 
        canCertify: false, 
        reason: 'Institution cannot verify theses',
        institutionName: institution.name 
      };
    }

    return { 
      canCertify: true, 
      institutionName: institution.name 
    };
    
  } catch (error) {
    return { canCertify: false, reason: 'Error checking certification permissions' };
  }
};

/**
 * Certifica una tesis
 */
export const certifyThesis = async (
  thesisId: string, 
  verifierId: string
): Promise<{ success: boolean; message: string; thesis?: any }> => {
  try {
    const certificationCheck = await canUserCertifyThesis(verifierId, thesisId);
    
    if (!certificationCheck.canCertify) {
      return { 
        success: false, 
        message: certificationCheck.reason || 'Cannot certify thesis' 
      };
    }

    const thesis = await Thesis.findByIdAndUpdate(
      thesisId,
      {
        isVerifiedByInstitution: true,
        verifiedAt: new Date(),
        verifiedBy: new Types.ObjectId(verifierId)
      },
      { new: true }
    ).populate(['institution', 'uploadedBy', 'verifiedBy']);

    return {
      success: true,
      message: `Thesis certified by ${certificationCheck.institutionName}`,
      thesis
    };
    
  } catch (error) {
    return { 
      success: false, 
      message: 'Error certifying thesis' 
    };
  }
};

/**
 * Revoca la certificación de una tesis
 */
export const revokeCertification = async (
  thesisId: string, 
  revokerId: string
): Promise<{ success: boolean; message: string }> => {
  try {
    const certificationCheck = await canUserCertifyThesis(revokerId, thesisId);
    
    if (!certificationCheck.canCertify) {
      return { 
        success: false, 
        message: certificationCheck.reason || 'Cannot revoke certification' 
      };
    }

    await Thesis.findByIdAndUpdate(thesisId, {
      isVerifiedByInstitution: false,
      verifiedAt: undefined,
      verifiedBy: undefined
    });

    return {
      success: true,
      message: 'Certification revoked successfully'
    };
    
  } catch (error) {
    return { 
      success: false, 
      message: 'Error revoking certification' 
    };
  }
};

/**
 * Valida automáticamente una tesis al momento de subir
 */
export const autoVerifyThesisOnUpload = async (
  thesis: any, 
  uploaderId: string
): Promise<{ isVerified: boolean; verifiedBy?: string }> => {
  try {
    // Necesitamos el ID de la tesis para verificar permisos
    const thesisId = thesis._id.toString();
    const certificationCheck = await canUserCertifyThesis(uploaderId, thesisId);
    
    if (certificationCheck.canCertify) {
      return {
        isVerified: true,
        verifiedBy: uploaderId
      };
    }
    
    return { isVerified: false };
    
  } catch (error) {
    console.error('Error in auto-verification:', error);
    return { isVerified: false };
  }
};