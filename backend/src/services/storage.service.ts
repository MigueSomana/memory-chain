import crypto from 'crypto';
import { Readable } from 'stream';

export interface UploadResult {
  cid: string;
  hash: string;
}

export const uploadThesisFile = async (buffer: Buffer): Promise<UploadResult> => {
  // Aquí deberías llamar a Storacha.
  // Esto es un mock para que compile.
  const hash = crypto.createHash('sha256').update(buffer).digest('hex');
  const cid = 'bafy...' + hash.substring(0, 10); // placeholder

  return { cid, hash };
};
