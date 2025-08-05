import fs from 'fs';
import crypto from 'crypto';
import { Web3Storage, File } from 'web3.storage';

const token = process.env.WEB3_STORAGE_TOKEN as string;
const client = new Web3Storage({ token });

export const uploadToIPFS = async (filePath: string) => {
  const content = fs.readFileSync(filePath);
  const hash = crypto.createHash('sha256').update(content).digest('hex');

  const file = new File([content], filePath.split('/').pop() || 'file.pdf');
  const cid = await client.put([file]);

  return { hash, ipfsHash: cid };
};
