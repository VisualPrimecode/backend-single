// tests/auth/refreshToken.test.ts

import request from 'supertest';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import app from '../app';
import User from '../models/User';
import { generateRefreshToken } from '../utils/token';

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  await mongoose.connect(process.env.MONGO_URI_TEST as string);
});

afterAll(async () => {
  await mongoose.connection.db.dropDatabase();
  await mongoose.disconnect();
});

afterEach(async () => {
  await User.deleteMany({});
});

describe('POST /refresh-token', () => {
  const endpoint = '/refresh-token'; // Cambia esto si en tu app está en otro path

  const userPayload = {
    email: 'refreshtest@example.com',
    password: 'SomePass123',
    name: 'Refresh Test',
    role: 'admin',
  };

  let userId: string;
  let refreshToken: string;

  beforeEach(async () => {
    const user = await new User(userPayload).save();
    userId = user._id.toString();
    refreshToken = generateRefreshToken(userId);
  });

  it('✅ Refrescar accessToken con refreshToken válido', async () => {
    const res = await request(app)
      .post(endpoint)
      .send({ refreshToken });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('New access token generated successfully');
    expect(res.body.data).toHaveProperty('accessToken');
    expect(res.body.data.user).toMatchObject({
      email: userPayload.email,
      name: userPayload.name,
    });
  });

  it('❌ No se envía token', async () => {
    const res = await request(app).post(endpoint).send({});
    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Refresh token not provided');
  });

  it('❌ Token inválido', async () => {
    const invalidToken = 'this.is.not.a.valid.token';
    const res = await request(app).post(endpoint).send({ refreshToken: invalidToken });

    expect(res.status).toBe(403);
    expect(res.body.message).toBe('Invalid refresh token');
  });

  it('❌ Usuario no encontrado', async () => {
    const fakeUserId = new mongoose.Types.ObjectId();
    const fakeToken = jwt.sign({ userId: fakeUserId }, process.env.JWT_REFRESH_SECRET as string, {
      expiresIn: '7d',
    });

    const res = await request(app).post(endpoint).send({ refreshToken: fakeToken });

    expect(res.status).toBe(404);
    expect(res.body.message).toBe('User not found');
  });

  it('✅ También acepta refreshToken por cookie', async () => {
    const res = await request(app)
      .post(endpoint)
      .set('Cookie', [`refreshToken=${refreshToken}`]);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('accessToken');
    expect(res.body.data.user).toHaveProperty('email', userPayload.email);
  });
});
