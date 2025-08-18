import fs from 'fs';
import crypto from 'crypto';
import { Web3Storage, File } from 'web3.storage';

const token = process.env.WEB3_STORAGE_TOKEN as string;

if (!token) {
  console.warn('WEB3_STORAGE_TOKEN not found. IPFS upload will fail.');
}

const client = token ? new Web3Storage({ token }) : null;

export interface IPFSUploadResult {
  hash: string;
  ipfsHash: string;
}

export const uploadToIPFS = async (filePath: string): Promise<IPFSUploadResult> => {
  const content = fs.readFileSync(filePath);
  const hash = crypto.createHash('sha256').update(content).digest('hex');

  if (!client) {
    console.warn('IPFS client not available. Using mock hash.');
    return { 
      hash, 
      ipfsHash: `mock-ipfs-${hash.substring(0, 16)}` 
    };
  }

  try {
    const file = new File([content], filePath.split('/').pop() || 'file.pdf', {
      type: 'application/pdf'
    });
    
    const cid = await client.put([file], {
      name: `thesis-${Date.now()}`,
      maxRetries: 3
    });

    console.log(`File uploaded to IPFS with CID: ${cid}`);
    
    return { hash, ipfsHash: cid };
  } catch (error) {
    console.error('Error uploading to IPFS:', error);
    // Fallback para desarrollo
    return { 
      hash, 
      ipfsHash: `fallback-ipfs-${hash.substring(0, 16)}` 
    };
  }
};

/**
 * Recupera un archivo desde IPFS
 */
export const retrieveFromIPFS = async (cid: string): Promise<Buffer | null> => {
  if (!client) {
    console.warn('IPFS client not available.');
    return null;
  }

  try {
    const res = await client.get(cid);
    if (!res) {
      return null;
    }
    
    const files = await res.files();
    
    if (files.length > 0) {
      const file = files[0];
      const arrayBuffer = await file.arrayBuffer();
      return Buffer.from(arrayBuffer);
    }
    
    return null;
  } catch (error) {
    console.error('Error retrieving from IPFS:', error);
    return null;
  }
};

/**
 * Verifica si un CID existe en IPFS
 */
export const verifyIPFSHash = async (cid: string): Promise<boolean> => {
  if (!client) {
    return false;
  }

  try {
    const res = await client.get(cid);
    if (!res) {
      return false;
    }
    
    const files = await res.files();
    return files.length > 0;
  } catch (error) {
    console.error('Error verifying IPFS hash:', error);
    return false;
  }
};