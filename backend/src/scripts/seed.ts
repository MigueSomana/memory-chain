/* eslint-disable no-console */
import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import Institution from '../models/Institution';
import { User } from '../models/User';
import { Thesis } from '../models/Thesis';

async function main() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/memorychain';
  await mongoose.connect(uri);
  console.log('Connected to MongoDB');

  const inst = await Institution.create({
    name: 'Universidad Demo',
    country: 'PE',
    emailDomain: 'demo.edu',
    type: 'public',
    isMember: true,
    canVerify: true
  });
  console.log('Institution created:', inst.name);

  const admin = await User.create({
    name: 'Admin',
    email: 'admin@memorychain.io',
    password: 'Password123',
    role: 'admin',
    institutions: [inst._id]
  });
  console.log('Admin created:', admin.email);

  const user = await User.create({
    name: 'Estudiante',
    email: 'student@demo.edu',
    password: 'Password123',
    role: 'user',
    educationalEmails: ['student@demo.edu'],
    institutions: [inst._id]
  });
  console.log('User created:', user.email);

  const thesis = await Thesis.create({
    title: 'Tesis de Ejemplo Seed',
    authors: [{ name: 'Estudiante', email: 'student@demo.edu' }],
    summary: 'Ejemplo de tesis almacenada para pruebas.',
    keywords: ['blockchain', 'ipfs'],
    language: 'es',
    degree: 'Licenciatura',
    workType: 'Tesis',
    department: 'Ingeniería',
    institution: inst._id,
    uploadedBy: user._id,
    publicationDate: new Date(),
    file: {
      filename: 'seed.pdf',
      size: 1234,
      mimetype: 'application/pdf',
      hash: 'seedhash',
      ipfsCid: 'bafyseedcid'
    },
    chain: 'polygon',
    blockchainHash: 'seedblockhash',
    txId: '0xseedtx',
    blockNumber: 1,
    status: 'published'
  });
  console.log('Thesis created:', thesis.title);

  await mongoose.disconnect();
  console.log('Seed done.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
