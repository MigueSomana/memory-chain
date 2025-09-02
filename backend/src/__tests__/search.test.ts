import request from 'supertest';
import app from '../app';

describe('Search', () => {
  it('GET /api/search returns 200', async () => {
    const res = await request(app).get('/api/search').query({ q: 'blockchain' });
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/json/);
  });
});
