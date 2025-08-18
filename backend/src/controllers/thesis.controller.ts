import { Request, Response } from "express";
import * as thesisService from "../services/thesis.service";
import * as certificationService from "../services/certification.service";
import { uploadToIPFS } from "../utils/ipfs";
import { generateBlockchainHash } from "../utils/blockchain";
import { cleanupTempFile } from "../middlewares/upload.middleware";
import { IThesis } from "../models/Thesis";
import { Types } from "mongoose";

export const createThesis = async (req: Request, res: Response) => {
  try {
    // Validar autenticación
    if (!req.user || !req.user._id) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const thesisData: Partial<IThesis> = {
      ...req.body,
      uploadedBy: new Types.ObjectId(req.user._id),
    };

    const thesis = await thesisService.createThesis(thesisData);
    res.status(201).json(thesis);
  } catch (error: any) {
    res.status(500).json({
      error: "Error creating thesis",
      details: error.message,
    });
  }
};

function hasNameProperty(obj: any): obj is { name: string } {
  return typeof obj === 'object' && obj !== null && 'name' in obj;
}

export const getAllTheses = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 10, verified, institution } = req.query;

    const filters: any = {};
    if (verified !== undefined)
      filters.isVerifiedByInstitution = verified === "true";
    if (institution) filters.institution = institution;

    const theses = await thesisService.getAllTheses(filters, {
      page: Number(page),
      limit: Number(limit),
    });

    res.status(200).json(theses);
  } catch (error) {
    res.status(500).json({ error: "Error retrieving theses" });
  }
};

export const getThesisById = async (req: Request, res: Response) => {
  try {
    const thesis = await thesisService.getThesisById(req.params.id);
    if (!thesis) return res.status(404).json({ error: "Thesis not found" });
    res.status(200).json(thesis);
  } catch (error) {
    res.status(500).json({ error: "Error retrieving thesis" });
  } 
};

export const updateThesis = async (req: Request, res: Response) => {
  try {
    const updated = await thesisService.updateThesis(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: "Thesis not found" });
    res.status(200).json(updated);
  } catch (error) {
    res.status(500).json({ error: "Error updating thesis" });
  }
};

export const deleteThesis = async (req: Request, res: Response) => {
  try {
    const deleted = await thesisService.deleteThesis(req.params.id);
    if (!deleted) return res.status(404).json({ error: "Thesis not found" });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: "Error deleting thesis" });
  }
};

export const searchTheses = async (req: Request, res: Response) => {
  try {
    const results = await thesisService.searchTheses(req.query);
    res.status(200).json(results);
  } catch (error) {
    res.status(500).json({ error: "Error searching theses" });
  }
};

export const uploadThesisWithFile = async (req: Request, res: Response) => {
  let tempFilePath = "";

  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    tempFilePath = file.path;

    // Validar que el usuario esté autenticado
    if (!req.user || !req.user._id) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    // Subir a IPFS y generar hashes
    console.log("Uploading to IPFS...");
    const { hash, ipfsHash } = await uploadToIPFS(tempFilePath);

    console.log("Generating blockchain hash...");
    const blockchainHash = await generateBlockchainHash(hash);

    // Preparar datos de la tesis con tipos correctos
    const thesisData: Partial<IThesis> = {
      title: req.body.title,
      authors: JSON.parse(req.body.authors || "[]"),
      summary: req.body.summary,
      keywords: req.body.keywords
        ? req.body.keywords.split(",").map((k: string) => k.trim())
        : [],
      language: req.body.language,
      publicationDate: new Date(req.body.publicationDate),
      career: req.body.career,
      degree: req.body.degree,
      type: req.body.type || "thesis",
      institution: new Types.ObjectId(req.body.institution),
      file: `uploads/theses/${file.filename}`,
      ipfsHash,
      blockchainHash,
      uploadedBy: new Types.ObjectId(req.user._id),
    };

    // Crear la tesis
    const thesis = await thesisService.createThesis(thesisData);

    // Verificar automáticamente si es posible
    const autoVerify = await certificationService.autoVerifyThesisOnUpload(
      thesis,
      req.user._id.toString()
    );

    if (autoVerify.isVerified && thesis._id) {
      await thesisService.updateThesis(
        (thesis._id as Types.ObjectId).toString(),
        {
          isVerifiedByInstitution: true,
          verifiedAt: new Date(),
          verifiedBy: new Types.ObjectId(req.user._id),
        }
      );
    }

    // Obtener la tesis completa con populate
    const completedThesis = thesis._id
      ? await thesisService.getThesisById(
          (thesis._id as Types.ObjectId).toString()
        )
      : thesis;

    res.status(201).json({
      thesis: completedThesis,
      autoVerified: autoVerify.isVerified,
      message: autoVerify.isVerified
        ? "Thesis uploaded and automatically verified"
        : "Thesis uploaded successfully",
    });
  } catch (error: any) {
    console.error("Error uploading thesis:", error);
    res.status(500).json({
      error: "Error uploading thesis",
      details: error.message,
    });
  } finally {
    // Limpiar archivo temporal
    if (tempFilePath) {
      cleanupTempFile(tempFilePath);
    }
  }
};

export const certifyThesis = async (req: Request, res: Response) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const result = await certificationService.certifyThesis(
      req.params.id,
      req.user._id.toString()
    );

    if (!result.success) {
      return res.status(403).json({ error: result.message });
    }

    res.status(200).json({
      message: result.message,
      thesis: result.thesis,
    });
  } catch (error) {
    res.status(500).json({ error: "Error certifying thesis" });
  }
};

export const revokeCertification = async (req: Request, res: Response) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const result = await certificationService.revokeCertification(
      req.params.id,
      req.user._id.toString()
    );

    if (!result.success) {
      return res.status(403).json({ error: result.message });
    }

    res.status(200).json({ message: result.message });
  } catch (error) {
    res.status(500).json({ error: "Error revoking certification" });
  }
};

export const getMyTheses = async (req: Request, res: Response) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const theses = await thesisService.getThesesByUploader(
      req.user._id.toString()
    );
    res.status(200).json(theses);
  } catch (error) {
    res.status(500).json({ error: "Error retrieving user theses" });
  }
};

export const getThesesByInstitution = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const result = await thesisService.getThesesByInstitution(
      req.params.institutionId,
      { page: Number(page), limit: Number(limit) }
    );
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: "Error retrieving institution theses" });
  }
};

export const getPendingTheses = async (req: Request, res: Response) => {
  try {
    const theses = await thesisService.getThesesPendingVerification(
      req.params.institutionId
    );
    res.status(200).json(theses);
  } catch (error) {
    res.status(500).json({ error: "Error retrieving pending theses" });
  }
};

export const getVerifiedTheses = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const result = await thesisService.getVerifiedTheses({
      page: Number(page),
      limit: Number(limit),
    });
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: "Error retrieving verified theses" });
  }
};

export const getThesesStats = async (req: Request, res: Response) => {
  try {
    const stats = await thesisService.getThesesStats();
    res.status(200).json(stats);
  } catch (error) {
    res.status(500).json({ error: "Error retrieving thesis statistics" });
  }
};

export const getAuthenticityCertificate = async (
  req: Request,
  res: Response
) => {
  try {
    const thesis = await thesisService.getThesisById(req.params.id);
    if (!thesis) {
      return res.status(404).json({ error: "Thesis not found" });
    }

    if (!thesis.isVerifiedByInstitution) {
      return res.status(400).json({ error: "Thesis is not verified" });
    }

    const { generateAuthenticityCertificate } = await import(
      "../utils/blockchain"
    );

    // Verificar que la institución esté populated
    const institutionName = hasNameProperty(thesis?.institution)
      ? thesis.institution.name
      : "Unknown Institution";

    const certificate = generateAuthenticityCertificate({
      thesisTitle: thesis.title,
      authors: thesis.authors.map((a) => a.name),
      institutionName,
      verificationDate: thesis.verifiedAt!,
      blockchainHash: thesis.blockchainHash,
      ipfsHash: thesis.ipfsHash,
    });

    res.status(200).json({
      certificate,
      thesis: {
        id: thesis._id,
        title: thesis.title,
        authors: thesis.authors,
        institution: institutionName,
        verifiedAt: thesis.verifiedAt,
      },
    });
  } catch (error) {
    res.status(500).json({ error: "Error generating certificate" });
  }
};

export const verifyOnBlockchain = async (req: Request, res: Response) => {
  try {
    const thesis = await thesisService.getThesisById(req.params.id);
    if (!thesis) {
      return res.status(404).json({ error: "Thesis not found" });
    }

    const { verifyOnBlockchain } = await import("../utils/blockchain");
    const verification = await verifyOnBlockchain(thesis.blockchainHash);

    res.status(200).json({
      thesis: {
        id: thesis._id,
        title: thesis.title,
        blockchainHash: thesis.blockchainHash,
        ipfsHash: thesis.ipfsHash,
      },
      verification,
    });
  } catch (error) {
    res.status(500).json({ error: "Error verifying on blockchain" });
  }
};
