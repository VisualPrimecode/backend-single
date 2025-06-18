process.env.NODE_ENV = 'test';
process.env.MONGO_URI_TEST = 'mongodb://127.0.0.1:27017/saas-db-test';
process.env.JWT_SECRET = 'testsecret';
process.env.JWT_REFRESH_SECRET = 'testrefreshsecret';

import request from 'supertest';
import mongoose from 'mongoose';
import app from '../app';
import User from '../models/User';

jest.mock('@pinecone-database/pinecone', () => {
  return {
    Pinecone: jest.fn().mockImplementation(() => ({
      // mock methods if needed
    })),
  };
});

beforeAll(async () => {
  await mongoose.connect(process.env.MONGO_URI_TEST as string);
});

afterEach(async () => {
  await User.deleteMany({});
});

afterAll(async () => {
  await mongoose.connection.close();
});

describe('POST /register', () => {
  const baseUser = {
    email: 'test@example.com',
    password: 'password123',
    name: 'Test User',
    role: 'business',
  };

  it('Registro exitoso', async () => {
    const response = await request(app)
      .post('/register')
      .send(baseUser);

    expect(response.status).toBe(201);
    expect(response.body.message).toBe('User registered successfully');
    expect(response.body.data).toHaveProperty('email', baseUser.email);
    expect(response.body.data).not.toHaveProperty('password');
    expect(response.body.data).toHaveProperty('name', baseUser.name);
  });

  it('Faltan campos requeridos', async () => {
    const response = await request(app)
      .post('/register')
      .send({ email: baseUser.email });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Validation failed');
    expect(response.body.errors).toHaveProperty('password');
    expect(response.body.errors).toHaveProperty('name');
    expect(response.body.errors).toHaveProperty('role');
  });

  it('Formato inválido (email malformado y contraseña corta)', async () => {
    const response = await request(app)
      .post('/register')
      .send({
        email: 'bademail',
        password: '123',
        name: 'T',
        role: 'business',
      });

    expect(response.status).toBe(400);
    expect(response.body.errors).toHaveProperty('email');
    expect(response.body.errors).toHaveProperty('password');
    expect(response.body.errors).toHaveProperty('name');
  });

  it('Usuario duplicado', async () => {
    await new User(baseUser).save();

    const response = await request(app)
      .post('/register')
      .send(baseUser);

    expect(response.status).toBe(409);
    expect(response.body.message).toBe('Email is already registered');
  });

  it('Rol no permitido', async () => {
    const response = await request(app)
      .post('/register')
      .send({ ...baseUser, email: 'new@example.com', role: 'superuser' });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Validation failed');
    expect(response.body.errors).toHaveProperty('role');
  });
});
