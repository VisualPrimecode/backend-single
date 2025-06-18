// tests/auth/logout.test.ts

import request from 'supertest';
import mongoose from 'mongoose';
import app from '../app';

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  await mongoose.connect(process.env.MONGO_URI_TEST as string);
});

afterAll(async () => {
  await mongoose.connection.db.dropDatabase();
  await mongoose.disconnect();
});

describe('POST /logout', () => {
  const endpoint = '/logout'; // ajusta si usas otra ruta

  it('✅ Logout exitoso con refreshToken cookie', async () => {
    const res = await request(app)
      .post(endpoint)
      .set('Cookie', ['refreshToken=fakeTokenValue']); // Simula presencia de token

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('User logged out successfully');

    const setCookie = res.headers['set-cookie'];
    expect(setCookie).toBeDefined();
    expect(setCookie[0]).toMatch(/refreshToken=;/); // Asegura que fue eliminado
  });

  it('✅ Logout exitoso sin refreshToken cookie', async () => {
    const res = await request(app).post(endpoint);
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('User logged out successfully');
  });

  it('❌ Método no permitido (GET)', async () => {
    const res = await request(app).get(endpoint);
    expect(res.status).toBeGreaterThanOrEqual(400); // depende si se bloquea GET
  });
});
