import "dotenv/config";
import express from "express";
import cors from "cors";
import { connectDB } from "./config/db";

import authRoutes from "./routes/auth.routes";
import userRoutes from "./routes/user.routes";
import institutionRoutes from "./routes/institution.routes";
import thesisRoutes from "./routes/thesis.routes";

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Rutas
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/institutions", institutionRoutes);
app.use("/api/theses", thesisRoutes);

app.get("/", (_req, res) => {
  res.json({ message: "MemoryChain API running" });
});

async function start() {
  await connectDB(process.env.MONGODB_URI as string);
  app.listen(PORT, () => {
    console.log(`🚀 Server escuchando en http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  console.error("Error al iniciar servidor", err);
});
