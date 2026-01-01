import { ethers } from "ethers";
import abi from "../blockchain/ThesisCertification.abi.json";

// Variables de entorno para conexión a Polygon
const RPC_URL = process.env.POLYGON_RPC_URL!;
const PRIVATE_KEY = process.env.BACKEND_WALLET_PRIVATE_KEY!;
const CONTRACT_ADDRESS = process.env.CERT_CONTRACT_ADDRESS!;
const CHAIN_ID = Number(process.env.POLYGON_CHAIN_ID || 80002); // Amoy por defecto

// Crea el provider para conectarse a la red blockchain
function getProvider() {
  return new ethers.JsonRpcProvider(RPC_URL, CHAIN_ID);
}

// Crea el signer usando la wallet del backend
// Se usa para firmar transacciones (write)
function getSigner() {
  const provider = getProvider();
  return new ethers.Wallet(PRIVATE_KEY, provider);
}

// Devuelve el contrato listo para escribir en blockchain (transacciones)
export function getCertContractWrite() {
  const signer = getSigner();
  return new ethers.Contract(CONTRACT_ADDRESS, abi, signer);
}

// Devuelve el contrato en modo lectura (sin firmar transacciones)
export function getCertContractRead() {
  const provider = getProvider();
  return new ethers.Contract(CONTRACT_ADDRESS, abi, provider);
}

// Certifica una tesis en blockchain
// Guarda metadata clave: IDs, CID IPFS y hash del archivo
export async function certifyOnChain(params: {
  thesisId: string;
  userId: string;
  institutionId: string;
  ipfsCid: string;
  fileHash: string;
  hashAlgorithm: string;
}) {
  const contract = getCertContractWrite();

  // Llama a la función certify del smart contract
  const tx = await contract.certify(
    params.thesisId,
    params.userId,
    params.institutionId,
    params.ipfsCid,
    params.fileHash,
    params.hashAlgorithm
  );

  // Espera a que la transacción sea minada
  const receipt = await tx.wait();

  return {
    txHash: tx.hash as string, // hash de la transacción
    chainId: CHAIN_ID, // red usada
    blockNumber: receipt?.blockNumber ? Number(receipt.blockNumber) : undefined,
  };
}

// Obtiene el certificado on-chain de una tesis por su ID
export async function getCertificateOnChain(thesisId: string) {
  const contract = getCertContractRead();
  return contract.getCertificate(thesisId);
}

// Verifica si una tesis ya está certificada en blockchain
export async function isCertifiedOnChain(thesisId: string) {
  const contract = getCertContractRead();
  return contract.isCertified(thesisId);
}
