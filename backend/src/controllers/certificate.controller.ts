import { Request, Response } from "express";
import { Thesis } from "../models/thesis.model";
import { getCertificateOnChain } from "../services/blockchain.service";

export async function getThesisCertificate(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const thesis = await Thesis.findById(id);
    if (!thesis) return res.status(404).json({ message: "Tesis no encontrada" });

    if (!thesis.txHash) {
      return res.status(404).json({ message: "Tesis no certificada todavía" });
    }

    const cert = await getCertificateOnChain(thesis._id.toString());

    // Construye link a polygonscan (amoy)
    const explorerTx = `https://amoy.polygonscan.com/tx/${thesis.txHash}`;

    return res.json({
      mongo: {
        thesisId: thesis._id.toString(),
        txHash: thesis.txHash,
        chainId: thesis.chainId,
        blockNumber: thesis.blockNumber,
      },
      onchain: {
        thesisId: cert.thesisId,
        userId: cert.userId,
        institutionId: cert.institutionId,
        ipfsCid: cert.ipfsCid,
        fileHash: cert.fileHash,
        hashAlgorithm: cert.hashAlgorithm,
        issuedAt: Number(cert.issuedAt),
      },
      explorerTx,
    });
  } catch (err) {
    console.error("Error getThesisCertificate", err);
    return res.status(500).json({ message: "Error del servidor" });
  }
}
