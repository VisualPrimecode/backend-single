// tests/auth/login.test.ts

import request from 'supertest';
import mongoose from 'mongoose';
import app from '../app'; 
import User from '../models/User';
import bcrypt from 'bcryptjs';

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

describe('POST /login', () => {
  const endpoint = '/login';

  const rawPassword = 'securePassword123';
  const hashedPassword = bcrypt.hashSync(rawPassword, 12);

  const userPayload = {
    email: 'testuser@example.com',
    password: rawPassword,
    name: 'Test User',
    role: 'business',
  };

  beforeEach(async () => {
    await new User({ ...userPayload, password: hashedPassword }).save();
  });

  it('✅ Login exitoso', async () => {
    const res = await request(app).post(endpoint).send({
      email: userPayload.email,
      password: userPayload.password,
    });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('User logged in successfully');
    expect(res.body.data).toHaveProperty('accessToken');
    expect(res.body.data).toHaveProperty('refreshToken');
    expect(res.body.data.user).toMatchObject({
      email: userPayload.email,
      name: userPayload.name,
      role: userPayload.role,
    });

    // Guardar token e ID si quieres usarlo luego
    const accessToken = res.body.data.accessToken;
    const userId = res.body.data.user.id;

    expect(typeof accessToken).toBe('string');
    expect(typeof userId).toBe('string');
  });

  it('❌ Email no registrado', async () => {
    const res = await request(app).post(endpoint).send({
      email: 'unknown@example.com',
      password: 'somePassword123',
    });

    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Invalid credentials');
  });

  it('❌ Contraseña incorrecta', async () => {
    const res = await request(app).post(endpoint).send({
      email: userPayload.email,
      password: 'wrongPassword',
    });

    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Invalid credentials');
  });

  it('❌ Formato inválido de email o contraseña', async () => {
    const res = await request(app).post(endpoint).send({
      email: 'invalid-email',
      password: '123',
    });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Invalid email or password format');
  });
});
