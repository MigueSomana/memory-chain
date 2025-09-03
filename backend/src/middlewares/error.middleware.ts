import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';

export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  // Log del error para debugging
  console.error('Error occurred:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  // Errores de validación de Mongoose
  if (err instanceof mongoose.Error.ValidationError) {
    const errors = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({
      error: 'Validation error',
      details: errors
    });
  }

  // Error de cast de MongoDB (ID inválido)
  if (err instanceof mongoose.Error.CastError) {
    return res.status(400).json({
      error: 'Invalid ID format',
      details: ['The provided ID is not a valid MongoDB ObjectId']
    });
  }

  // Error de duplicado (índice único)
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0];
    return res.status(409).json({
      error: 'Duplicate entry',
      details: [`${field} already exists`]
    });
  }

  // Errores de JWT
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: 'Invalid token',
      details: ['The provided token is malformed or invalid']
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      error: 'Token expired',
      details: ['Please login again']
    });
  }

  // Errores de Multer (subida de archivos)
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      error: 'File too large',
      details: ['File size exceeds the maximum allowed limit']
    });
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({
      error: 'Unexpected file',
      details: ['Unexpected file field or too many files']
    });
  }

  // Error personalizado con status
  if (err.status || err.statusCode) {
    const status = err.status || err.statusCode;
    return res.status(status).json({
      error: err.message || 'Request failed',
      details: err.details || []
    });
  }

  // Error genérico del servidor
  const status = 500;
  const message = process.env.NODE_ENV === 'production' 
    ? 'Internal server error' 
    : err.message || 'Something went wrong';

  res.status(status).json({
    error: message,
    ...(process.env.NODE_ENV !== 'production' && { 
      stack: err.stack,
      details: err.details || []
    })
  });
}

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({
    error: 'Not found',
    message: `Route ${req.method} ${req.originalUrl} not found`,
    timestamp: new Date().toISOString()
  });
}

export function asyncErrorHandler(fn: Function) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}