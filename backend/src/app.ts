import 'dotenv/config'; // carga variables de entorno

import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import mongoose from 'mongoose';

import api from './routes/global.routes';
import { errorHandler } from './middlewares/error.middleware';

const app = express();

// Middlewares base
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(morgan('dev'));

// Healthcheck rápido
app.get('/healthz', (_req, res) => {
  res.json({ ok: true, uptime: process.uptime() });
});

// API principal
app.use('/api', api);

// Manejo de rutas no encontradas (404)
app.use((req, res, _next) => {
  res.status(404).json({ success: false, message: `Not Found: ${req.method} ${req.originalUrl}` });
});

// Error handler central
app.use(errorHandler);

// --- Arranque del servidor + conexión a Mongo ---
const PORT = Number(process.env.PORT || 3000);
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/memorychain';

// Conecta a Mongo y luego levanta el server
mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log('[MongoDB] Connected');
    app.listen(PORT, () => {
      console.log(`[Server] Listening on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('[MongoDB] Connection error:', err);
    process.exit(1);
  });

export default app;
