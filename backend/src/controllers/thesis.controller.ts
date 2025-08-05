import { Request, Response } from 'express';
import * as thesisService from '../services/thesis.service';
import path from 'path';
import * as fs from 'fs';
import { uploadToIPFS } from '../utils/ipfs';

export const createThesis = async (req: Request, res: Response) => {
  try {
    const thesis = await thesisService.createThesis(req.body);
    res.status(201).json(thesis);
  } catch (error) {
    res.status(500).json({ error: 'Error creating thesis' });
  }
};

export const getAllTheses = async (_req: Request, res: Response) => {
  try {
    const theses = await thesisService.getAllTheses();
    res.status(200).json(theses);
  } catch (error) {
    res.status(500).json({ error: 'Error retrieving theses' });
  }
};

export const getThesisById = async (req: Request, res: Response) => {
  try {
    const thesis = await thesisService.getThesisById(req.params.id);
    if (!thesis) return res.status(404).json({ error: 'Thesis not found' });
    res.status(200).json(thesis);
  } catch (error) {
    res.status(500).json({ error: 'Error retrieving thesis' });
  }
};

export const updateThesis = async (req: Request, res: Response) => {
  try {
    const updated = await thesisService.updateThesis(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: 'Thesis not found' });
    res.status(200).json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Error updating thesis' });
  }
};

export const deleteThesis = async (req: Request, res: Response) => {
  try {
    const deleted = await thesisService.deleteThesis(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Thesis not found' });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Error deleting thesis' });
  }
};

export const filterTheses = async (req: Request, res: Response) => {
  try {
    const results = await thesisService.filterTheses(req.query);
    res.status(200).json(results);
  } catch (error) {
    res.status(500).json({ error: 'Error filtering theses' });
  }
};

export const uploadThesisWithFile = async (req: Request, res: Response) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'No file uploaded' });

    const filePath = path.resolve(file.path);
    const { hash, ipfsHash } = await uploadToIPFS(filePath);

    const thesisData = {
      ...req.body,
      fileUrl: `uploads/${file.filename}`,
      hash,
      ipfsHash,
    };

    const thesis = await thesisService.createThesis(thesisData);

    fs.unlinkSync(filePath); // opcional: eliminar archivo local luego de subir a IPFS

    res.status(201).json(thesis);
  } catch (error) {
    res.status(500).json({ error: 'Error uploading thesis' });
  }
};