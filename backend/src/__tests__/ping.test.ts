import request from 'supertest';
import app from '../app';

describe('Healthcheck', () => {
  it('GET /api/ping → 200', async () => {
    const res = await request(app).get('/api/ping');
    expect(res.status).toBe(200);
    expect(res.text).toMatch(/pong/);
  });
});
