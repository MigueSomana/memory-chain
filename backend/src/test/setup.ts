import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

let mongod: MongoMemoryServer;

jest.setTimeout(60000);

beforeAll(async () => {
  process.env.MOCK_BLOCKCHAIN = 'true';
  process.env.WEB3_STORAGE_TOKEN = ''; // evita llamadas reales
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.connection.close();
  if (mongod) await mongod.stop();
});

/*
afterEach(async () => {
  const collections = await mongoose.connection.db.collections();
  for (const c of collections) await c.deleteMany({});
});
*/
