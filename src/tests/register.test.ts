// tests/auth/register.test.ts
process.env.NODE_ENV = 'test';
process.env.MONGO_URI_TEST = 'mongodb://127.0.0.1:27017/saas-db-test';
process.env.JWT_SECRET = 'testsecret';
process.env.JWT_REFRESH_SECRET = 'testrefreshsecret';

import request from 'supertest';
import mongoose from 'mongoose';
import app from '../app'; 
import User from '../models/User';

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

describe('POST /register', () => {
  const endpoint = '/register';

  const validUser = {
    email: 'testuser@example.com',
    password: 'securePassword123',
    name: 'Test User',
    role: 'business',
  };

  it('✅ Registro exitoso', async () => {
    const res = await request(app).post(endpoint).send(validUser);
    expect(res.status).toBe(201);
    expect(res.body.message).toBe('User registered successfully');
    expect(res.body.data).toHaveProperty('email', validUser.email);
    expect(res.body.data).not.toHaveProperty('password');
    expect(res.body.data).toHaveProperty('name', validUser.name);
  });

  it('❌ Faltan campos obligatorios', async () => {
    const res = await request(app).post(endpoint).send({
      email: 'test@example.com',
    });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Validation failed');
    expect(res.body.errors).toHaveProperty('password');
    expect(res.body.errors).toHaveProperty('name');
    expect(res.body.errors).toHaveProperty('role');
  });

  it('❌ Formato inválido de email', async () => {
    const res = await request(app).post(endpoint).send({
      ...validUser,
      email: 'invalidemail',
    });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Validation failed');
    expect(res.body.errors).toHaveProperty('email');
  });

  it('❌ Contraseña demasiado corta', async () => {
    const res = await request(app).post(endpoint).send({
      ...validUser,
      password: '123',
    });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Validation failed');
    expect(res.body.errors).toHaveProperty('password');
  });

  it('❌ Usuario duplicado', async () => {
    await new User(validUser).save(); // Seed user
    const res = await request(app).post(endpoint).send(validUser);
    expect(res.status).toBe(409);
    expect(res.body.message).toBe('Email is already registered');
  });

  it('❌ Rol no permitido', async () => {
    const res = await request(app).post(endpoint).send({
      ...validUser,
      role: 'hacker', // ❌ Not in ['admin', 'business']
    });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Validation failed');
    expect(res.body.errors).toHaveProperty('role');
  });
});
