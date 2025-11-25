import * as Client from '@storacha/client';
import { StoreMemory } from '@storacha/client/stores/memory';
import * as Proof from '@storacha/client/proof';
import { Signer } from '@storacha/client/principal/ed25519';
import { filesFromPaths } from 'files-from-path';
import path from 'path';

let clientPromise: Promise<any> | null = null;

async function initStorachaClient(): Promise<any> {
  const KEY = process.env.STORACHA_KEY;
  const PROOF = process.env.STORACHA_PROOF;

  if (!KEY || !PROOF) {
    throw new Error('Faltan STORACHA_KEY o STORACHA_PROOF en .env');
  }

  const principal = Signer.parse(KEY);
  const store = new StoreMemory();

  const client = await Client.create({ principal, store });

  const proof = await Proof.parse(PROOF);
  const space = await client.addSpace(proof);
  await client.setCurrentSpace(space.did());

  console.log('✅ Storacha client inicializado');
  return client;
}

export function getStorachaClient(): Promise<any> {
  if (!clientPromise) {
    clientPromise = initStorachaClient();
  }
  return clientPromise;
}

/**
 * Sube un archivo (en disco) a Storacha como un directorio
 * y devuelve el CID.
 */
export async function uploadFileToStoracha(filePath: string): Promise<string> {
  const client = await getStorachaClient();

  const absPath = path.resolve(filePath);
  const files = await filesFromPaths([absPath]); // File[] compatible :contentReference[oaicite:3]{index=3}

  const cid = await client.uploadDirectory(files);
  return cid.toString ? cid.toString() : String(cid);
}