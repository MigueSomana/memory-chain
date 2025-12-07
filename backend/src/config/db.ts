import mongoose from "mongoose";

export async function connectDB(mongoUri: string) {
  try {
    await mongoose.connect(mongoUri);
    console.log("✅ MongoDB conectado");
  } catch (err) {
    console.error("❌ Error conectando a MongoDB", err);
    process.exit(1);
  }
}
