import crypto from 'crypto';
import { nanoid } from 'nanoid';

/**
 * Genera un hash único para el blockchain basado en el contenido del archivo
 */
export const generateBlockchainHash = async (fileHash: string): Promise<string> => {
  const timestamp = Date.now().toString();
  const nonce = nanoid(16);
  const combinedData = `${fileHash}-${timestamp}-${nonce}`;
  
  return crypto
    .createHash('sha256')
    .update(combinedData)
    .digest('hex');
};

/**
 * Valida un hash de blockchain
 */
export const validateBlockchainHash = (hash: string): boolean => {
  const hexRegex = /^[a-f0-9]{64}$/i;
  return hexRegex.test(hash);
};

/**
 * Simula el registro en blockchain (para MVP)
 * En producción, esto se conectaría a una red blockchain real
 */
export const registerOnBlockchain = async (data: {
  hash: string;
  ipfsHash: string;
  thesisId: string;
  authorEmails: string[];
  institutionId: string;
}): Promise<{ 
  success: boolean; 
  transactionId?: string; 
  blockNumber?: number;
  error?: string;
}> => {
  try {
    // Simular delay de red blockchain
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Simular transacción exitosa
    const transactionId = crypto.randomBytes(32).toString('hex');
    const blockNumber = Math.floor(Math.random() * 1000000) + 1000000;
    
    console.log(`[BLOCKCHAIN MOCK] Registered thesis ${data.thesisId}:`, {
      transactionId,
      blockNumber,
      hash: data.hash,
      ipfsHash: data.ipfsHash
    });
    
    return {
      success: true,
      transactionId,
      blockNumber
    };
    
  } catch (error) {
    return {
      success: false,
      error: 'Failed to register on blockchain'
    };
  }
};

/**
 * Verifica la existencia de un hash en el blockchain
 */
export const verifyOnBlockchain = async (hash: string): Promise<{
  exists: boolean;
  transactionId?: string;
  blockNumber?: number;
  timestamp?: Date;
}> => {
  try {
    // Simular búsqueda en blockchain
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Para el MVP, siempre devolver que existe
    // En producción, esto consultaría la blockchain real
    return {
      exists: true,
      transactionId: crypto.randomBytes(32).toString('hex'),
      blockNumber: Math.floor(Math.random() * 1000000) + 1000000,
      timestamp: new Date()
    };
    
  } catch (error) {
    return { exists: false };
  }
};

/**
 * Genera un certificado digital de autenticidad
 */
export const generateAuthenticityCertificate = (data: {
  thesisTitle: string;
  authors: string[];
  institutionName: string;
  verificationDate: Date;
  blockchainHash: string;
  ipfsHash: string;
}): string => {
  const certificateData = {
    title: data.thesisTitle,
    authors: data.authors,
    institution: data.institutionName,
    verifiedAt: data.verificationDate.toISOString(),
    blockchainHash: data.blockchainHash,
    ipfsHash: data.ipfsHash,
    certificateId: nanoid(16),
    issuedAt: new Date().toISOString()
  };
  
  // En producción, esto podría ser un JWT firmado o un certificado digital real
  return Buffer.from(JSON.stringify(certificateData)).toString('base64');
};