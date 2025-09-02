import crypto from 'crypto';

const MOCK_BLOCKCHAIN = (process.env.MOCK_BLOCKCHAIN || 'true') === 'true';

export function generateBlockchainAnchor(fileHash: string): string {
  const nonce = crypto.randomBytes(8).toString('hex');
  return crypto.createHash('sha256').update(`${fileHash}-${Date.now()}-${nonce}`).digest('hex');
}

export async function anchorToPolygon(params: {
  thesisId: string;
  fileHash: string;          // sha256 local
  ipfsCid: string;
}): Promise<{ blockchainHash: string; txId?: string; blockNumber?: number; chain: 'polygon' }> {
  const blockchainHash = generateBlockchainAnchor(params.fileHash);

  if (MOCK_BLOCKCHAIN) {
    // Simulación determinista
    const txId = crypto.createHash('sha1').update(`tx:${blockchainHash}`).digest('hex');
    return { blockchainHash, txId, blockNumber: Math.floor(Date.now() / 1000), chain: 'polygon' };
  }

  // TODO: Integrar ethers + contrato (Hardhat/Truffle)
  // Ejemplo: await contract.storeHash(blockchainHash, params.ipfsCid)
  throw new Error('Real Polygon anchoring not implemented yet');
}
