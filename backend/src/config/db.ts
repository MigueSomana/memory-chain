import mongoose from "mongoose";

// Conecta la aplicación a MongoDB
export async function connectDB(mongoUri: string) {
  try {
    // Intenta establecer conexión con la base de datos
    await mongoose.connect(mongoUri);
  } catch (err) {
    // Si falla la conexión, muestra el error y detiene la app
    console.error("❌ Error conectando a MongoDB", err);
    process.exit(1);
  }
}
