import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import fs from 'fs';
import path from 'path';
import institutionRoutes from './routes/institution.routes';
import userRoutes from './routes/user.routes';
import thesisRoutes from './routes/thesis.routes';
import authRoutes from './routes/auth.routes';
import certificationRoutes from './routes/certification.routes';
import searchRoutes from './routes/search.routes';

dotenv.config();
const app = express();

app.use(cors());
app.use(helmet());
app.use(morgan('dev'));
app.use(compression());
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 300 }));

// Swagger
const openapiPath = path.join(__dirname, 'openapi.json');
if (fs.existsSync(openapiPath)) {
  const spec = JSON.parse(fs.readFileSync(openapiPath, 'utf8'));
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(spec));
}

// Rutas
app.get('/api/ping', (_req, res) => res.send('pong 🏓'));
app.use('/api/institutions', institutionRoutes);
app.use('/api/users', userRoutes);
app.use('/api/theses', thesisRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/certification', certificationRoutes);
app.use('/api/search', searchRoutes);

export default app;
