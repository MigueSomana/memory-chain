import fs from 'fs';
import crypto from 'crypto';
import { Web3Storage, File } from 'web3.storage';

const token = process.env.WEB3_STORAGE_TOKEN || '';
const client = token ? new Web3Storage({ token }) : null;

export interface IPFSUploadResult {
  hash: string;     // sha256 local del PDF
  ipfsCid: string;  // CID
}

export function sha256File(path: string): string {
  const h = crypto.createHash('sha256');
  const data = fs.readFileSync(path);
  h.update(data);
  return h.digest('hex');
}

export async function uploadToIPFS(filePath: string): Promise<IPFSUploadResult> {
  const hash = sha256File(filePath);

  // Fallback en desarrollo sin token
  if (!client) {
    const fakeCid = crypto.createHash('sha1').update(`cid:${hash}`).digest('hex').slice(0, 46);
    return { hash, ipfsCid: `bafy${fakeCid}` };
  }

  const content = fs.readFileSync(filePath);
  const file = new File([content], filePath.split('/').pop() || 'file.pdf', { type: 'application/pdf' });

  const cid = await client.put([file], { name: `thesis-${Date.now()}`, maxRetries: 3 });
  return { hash, ipfsCid: cid };
}
