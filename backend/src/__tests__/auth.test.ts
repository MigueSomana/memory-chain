import request from 'supertest';
import app from '../app';
import { User } from '../models/User';

describe('Auth flow', () => {
  it('registers and logs in', async () => {
    const reg = await request(app).post('/api/auth/register').send({
      name: 'Ada',
      email: 'ada@example.com',
      password: 'Password123'
    });
    expect(reg.status).toBeGreaterThanOrEqual(200);
    expect(reg.status).toBeLessThan(300);

    const login = await request(app).post('/api/auth/login').send({
      email: 'ada@example.com',
      password: 'Password123'
    });
    expect(login.status).toBe(200);
    expect(login.body).toHaveProperty('token');
    const user = await User.findOne({ email: 'ada@example.com' });
    expect(user).toBeTruthy();
  });
});
