import "dotenv/config";
import express from "express";
import cors from "cors";
import { connectDB } from "./config/db";

// Importación de rutas de la API
import authRoutes from "./routes/auth.routes";
import userRoutes from "./routes/user.routes";
import institutionRoutes from "./routes/institution.routes";
import thesisRoutes from "./routes/thesis.routes";
import certificateRoutes from "./routes/certificate.routes";

const app = express();
const PORT = process.env.PORT || 4000;

// Middlewares globales
app.use(cors()); // Habilita CORS para el frontend
app.use(express.json()); // Permite recibir JSON en el body

// --------- RUTAS DE LA API ---------
app.use("/api/auth", authRoutes); // Auth: login y registro
app.use("/api/users", userRoutes); // Usuarios
app.use("/api/institutions", institutionRoutes); // Instituciones
app.use("/api/theses", thesisRoutes); // Tesis
app.use("/api", certificateRoutes); // Certificados (blockchain)

// Ruta base de prueba
app.get("/", (_req, res) => {
  res.json({ message: "MemoryChain API running" });
});

// Función de arranque del servidor
async function start() {
  // Conecta a MongoDB antes de levantar el servidor
  await connectDB(process.env.MONGODB_URI as string);

  // Inicia el servidor HTTP
  app.listen(PORT, () => {
    console.log(`🚀 Server escuchando en http://localhost:${PORT}`);
  });
}

// Arranque con manejo de errores
start().catch((err) => {
  console.error("Error al iniciar servidor", err);
});