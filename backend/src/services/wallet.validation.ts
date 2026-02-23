import { ethers } from "ethers";

const RPC_URL = process.env.POLYGON_RPC_URL!;
const CHAIN_ID = Number(process.env.POLYGON_CHAIN_ID || 80002);

function getProvider() {
  if (!RPC_URL) throw new Error("POLYGON_RPC_URL no está configurado");
  return new ethers.JsonRpcProvider(RPC_URL, CHAIN_ID);
}

export function isPrivateKey(value?: string) {
  const v = String(value ?? "").trim();
  return /^0x[0-9a-fA-F]{64}$/.test(v);
}

export async function assertPrivateKeyWithFunds(privateKey: string) {
  const pk = String(privateKey ?? "").trim();
  if (!isPrivateKey(pk)) {
    throw new Error("Wallet de institución inválida: debe ser PRIVATE KEY 0x...");
  }

  const provider = getProvider();
  const wallet = new ethers.Wallet(pk, provider);
  const bal = await provider.getBalance(wallet.address);

  // ✅ pediste validar fondos
  if (bal <= 0n) {
    throw new Error(
      `Wallet de institución sin fondos (${wallet.address}). Necesita MATIC para gas.`
    );
  }

  return { address: wallet.address, balanceWei: bal };
}

export async function assertAddressWithFunds(address: string) {
  const addr = String(address ?? "").trim();
  if (!ethers.isAddress(addr)) {
    throw new Error("Wallet de usuario inválida: debe ser un address 0x...");
  }

  const provider = getProvider();
  const bal = await provider.getBalance(addr);

  // ✅ pediste validar fondos
  if (bal <= 0n) {
    throw new Error(
      `Wallet de usuario sin fondos (${addr}). Debe tener MATIC si va a usarse.`
    );
  }

  return { address: addr, balanceWei: bal };
}