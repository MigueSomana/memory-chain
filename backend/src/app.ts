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

// Importar rutas
import institutionRoutes from './routes/institution.routes';
import userRoutes from './routes/user.routes';
import thesisRoutes from './routes/thesis.routes';
import authRoutes from './routes/auth.routes';
import certificationRoutes from './routes/certification.routes';
import searchRoutes from './routes/search.routes';

dotenv.config();
const app = express();

// Middlewares básicos
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(compression());
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// Rate limiting
const limiter = rateLimit({ 
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: process.env.NODE_ENV === 'production' ? 100 : 300,
  message: {
    error: 'Too many requests',
    details: 'Please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Swagger documentation
const openapiPath = path.join(__dirname, 'openapi.json');
if (fs.existsSync(openapiPath)) {
  try {
    const spec = JSON.parse(fs.readFileSync(openapiPath, 'utf8'));
    app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(spec, {
      customCss: '.swagger-ui .topbar { display: none }',
      customSiteTitle: 'MemoryChain API Documentation'
    }));
  } catch (error) {
    console.warn('Error loading OpenAPI spec:', error);
  }
}

// Health checks
app.get('/api/ping', (_req, res) => {
  res.status(200).json({
    message: 'pong 🏓',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

app.get('/api/health', (_req, res) => {
  res.status(200).json({
    status: 'healthy',
    version: '1.0.0',
    services: {
      database: 'connected',
      ipfs: 'available',
      blockchain: process.env.MOCK_BLOCKCHAIN === 'true' ? 'mock' : 'connected'
    }
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/institutions', institutionRoutes);
app.use('/api/users', userRoutes);
app.use('/api/theses', thesisRoutes);
app.use('/api/certification', certificationRoutes);
app.use('/api/search', searchRoutes);

// 404 handler
app.use('*', (_req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    message: 'The requested resource does not exist',
    availableEndpoints: {
      auth: '/api/auth',
      institutions: '/api/institutions',
      users: '/api/users',
      theses: '/api/theses',
      certification: '/api/certification',
      search: '/api/search',
      docs: '/api/docs'
    }
  });
});

// Error handling middleware
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Error:', err);
  
  const status = err.status || err.statusCode || 500;
  const message = process.env.NODE_ENV === 'production' 
    ? 'Internal server error' 
    : err.message || 'Something went wrong';
  
  res.status(status).json({
    error: message,
    ...(process.env.NODE_ENV !== 'production' && { 
      stack: err.stack 
    })
  });
});

export default app;