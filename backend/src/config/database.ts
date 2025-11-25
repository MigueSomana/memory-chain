import mongoose from 'mongoose';

export async function connectDB(mongoUri: string): Promise<void> {
  try {
    await mongoose.connect(mongoUri);
    console.log('✅ MongoDB conectado');
  } catch (error) {
    console.error('❌ Error conectando a MongoDB', error);
    process.exit(1);
  }
}
