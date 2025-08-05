import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/db';
import institutionRoutes from './routes/institution.routes';
import userRoutes from './routes/user.routes';
import thesisRoutes from './routes/thesis.routes';
import authRoutes from "./routes/auth.routes";


dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(cors());
app.use(express.json());

//Routes
app.use('/api/institutions', institutionRoutes);
app.use('/api/users', userRoutes);
app.use('/api/theses', thesisRoutes);
app.use("/api/auth", authRoutes);

// Test route
app.get('/api/ping', (_req, res) => {
  res.send('pong 🏓');
});

// Start server
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});
