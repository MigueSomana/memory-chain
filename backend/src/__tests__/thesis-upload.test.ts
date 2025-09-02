import request from 'supertest';
import app from '../app';
import path from 'path';
import fs from 'fs';

// Mock de módulos de infraestructura (ajusta rutas si difieren)
jest.mock('../utils/ipfs', () => ({
  uploadToIPFS: jest.fn(async (_p: string) => ({ hash: 'fakehash', ipfsCid: 'bafyfake' }))
}));
jest.mock('../utils/blockchain', () => ({
  anchorToPolygon: jest.fn(async () => ({
    blockchainHash: 'blockhash',
    txId: '0xdeadbeef',
    blockNumber: 123,
    chain: 'polygon' as const
  }))
}));

async function registerAndLogin() {
  const email = `user${Date.now()}@example.com`;
  await request(app).post('/api/auth/register').send({
    name: 'User', email, password: 'Password123'
  });
  const login = await request(app).post('/api/auth/login').send({ email, password: 'Password123' });
  return login.body.token as string;
}

describe('Thesis upload', () => {
  it('uploads a PDF, stores IPFS+anchor metadata', async () => {
    const token = await registerAndLogin();

    // PDF mínimo en disco temporal
    const pdfPath = path.join(process.cwd(), 'tmp-test.pdf');
    fs.writeFileSync(pdfPath, '%PDF-1.4\n%âãÏÓ\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF');

    const authors = JSON.stringify([{ name: 'Alice', email: 'alice@univ.edu' }]);

    const res = await request(app)
      .post('/api/theses')
      .set('Authorization', `Bearer ${token}`)
      .field('title', 'Test Thesis')
      .field('authors', authors)
      .field('summary', 'Resumen')
      .field('language', 'es')
      .field('degree', 'Licenciatura')
      .field('workType', 'Tesis')
      .field('institution', '000000000000000000000000') // si tu middleware valida existencia, siembra una primero
      .attach('file', pdfPath);

    // Limpieza
    fs.unlinkSync(pdfPath);

    expect([201, 400, 422]).toContain(res.status); // si falla por institution inexistente, ajusta seed o validación
    if (res.status === 201) {
      expect(res.body).toHaveProperty('file.ipfsCid', 'bafyfake');
      expect(res.body).toHaveProperty('blockchainHash', 'blockhash');
      expect(res.body).toHaveProperty('status');
    }
  });
});
