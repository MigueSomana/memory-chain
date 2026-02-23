import { Request, Response } from "express";
import { Thesis } from "../models/thesis.model";
import { getCertificateOnChain } from "../services/blockchain.service";

function jsonSafe<T>(value: T): any {
  if (typeof value === "bigint") return value.toString();

  if (Array.isArray(value)) return value.map(jsonSafe);

  if (value && typeof value === "object") {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(value as any)) out[k] = jsonSafe(v);
    return out;
  }

  return value;
}

export async function getThesisCertificate(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const thesis = await Thesis.findById(id);
    if (!thesis) return res.status(404).json({ message: "Tesis no encontrada" });

    if (!thesis.txHash) {
      return res.status(404).json({ message: "Tesis no certificada todavía" });
    }

    // ✅ AHORA: el certificado se busca por fileHash
    const cert = await getCertificateOnChain(thesis.fileHash);

    const explorerTx = `https://amoy.polygonscan.com/tx/${thesis.txHash}`;

    return res.json({
      mongo: {
        thesisId: thesis._id.toString(),
        txHash: thesis.txHash,
        chainId: thesis.chainId,
        blockNumber: thesis.blockNumber,
        ipfsCid: thesis.ipfsCid,
        fileHash: thesis.fileHash,
        status: thesis.status,
      },
      onChain: jsonSafe(cert),
      explorerTx,
    });
  } catch (err) {
    console.error("Error getThesisCertificate", err);
    return res.status(500).json({ message: "Error del servidor" });
  }
}