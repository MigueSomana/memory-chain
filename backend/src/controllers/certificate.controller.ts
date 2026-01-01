import { Request, Response } from "express";
import { Thesis } from "../models/thesis.model";
import { getCertificateOnChain } from "../services/blockchain.service";

// Devuelve el certificado de una tesis combinando datos de Mongo + blockchain
export async function getThesisCertificate(req: Request, res: Response) {
  try {
    const { id } = req.params;

    // Busca la tesis en MongoDB
    const thesis = await Thesis.findById(id);
    if (!thesis) return res.status(404).json({ message: "Tesis no encontrada" });

    // Si no tiene txHash, todavía no fue certificada on-chain
    if (!thesis.txHash) {
      return res.status(404).json({ message: "Tesis no certificada todavía" });
    }

    // Consulta el certificado en blockchain usando el thesisId
    const cert = await getCertificateOnChain(thesis._id.toString());

    // Construye link al explorador de Polygon Amoy para ver la transacción
    const explorerTx = `https://amoy.polygonscan.com/tx/${thesis.txHash}`;

    // Respuesta: metadata guardada en Mongo + datos retornados on-chain + link del explorer
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
        issuedAt: Number(cert.issuedAt), // convertir a number por compatibilidad JSON
      },
      explorerTx,
    });
  } catch (err) {
    console.error("Error getThesisCertificate", err);
    return res.status(500).json({ message: "Error del servidor" });
  }
}
