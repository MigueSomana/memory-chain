import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';

import authRoutes from './routes/auth.routes';
import thesisRoutes from './routes/thesis.routes';
import institutionRoutes from './routes/institution.routes';

const app = express();

app.use(cors());
app.use(express.json());

// Conexión a Mongo
const MONGODB_URI = process.env.MONGODB_URI||'null';

mongoose
  .connect(MONGODB_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch((err) => console.error('❌ MongoDB error:', err));

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/thesis', thesisRoutes);
app.use('/api/institutions', institutionRoutes);

export default app;
