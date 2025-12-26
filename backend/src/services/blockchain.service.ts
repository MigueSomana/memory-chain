import { ethers } from "ethers";
import abi from "../blockchain/ThesisCertification.abi.json";

const RPC_URL = process.env.POLYGON_RPC_URL!;
const PRIVATE_KEY = process.env.BACKEND_WALLET_PRIVATE_KEY!;
const CONTRACT_ADDRESS = process.env.CERT_CONTRACT_ADDRESS!;
const CHAIN_ID = Number(process.env.POLYGON_CHAIN_ID || 80002);

function getProvider() {
  return new ethers.JsonRpcProvider(RPC_URL, CHAIN_ID);
}

function getSigner() {
  const provider = getProvider();
  return new ethers.Wallet(PRIVATE_KEY, provider);
}

export function getCertContractWrite() {
  const signer = getSigner();
  return new ethers.Contract(CONTRACT_ADDRESS, abi, signer);
}

export function getCertContractRead() {
  const provider = getProvider();
  return new ethers.Contract(CONTRACT_ADDRESS, abi, provider);
}

export async function certifyOnChain(params: {
  thesisId: string;
  userId: string;
  institutionId: string;
  ipfsCid: string;
  fileHash: string;
  hashAlgorithm: string;
}) {
  const contract = getCertContractWrite();

  const tx = await contract.certify(
    params.thesisId,
    params.userId,
    params.institutionId,
    params.ipfsCid,
    params.fileHash,
    params.hashAlgorithm
  );

  const receipt = await tx.wait();

  return {
    txHash: tx.hash as string,
    chainId: CHAIN_ID,
    blockNumber: receipt?.blockNumber ? Number(receipt.blockNumber) : undefined,
  };
}

export async function getCertificateOnChain(thesisId: string) {
  const contract = getCertContractRead();
  return contract.getCertificate(thesisId);
}

export async function isCertifiedOnChain(thesisId: string) {
  const contract = getCertContractRead();
  return contract.isCertified(thesisId);
}
