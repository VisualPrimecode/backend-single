import request from 'supertest';
import mongoose from 'mongoose';
import app from '../app';
import User from '../models/User';
import { generateAccessToken } from '../utils/token';

let server: any;
let testUser: any;
let accessToken: string;

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  await mongoose.connect(process.env.MONGO_URI_TEST as string);
});

afterAll(async () => {
  await mongoose.connection.db.dropDatabase();
  await mongoose.disconnect();
  if (server) server.close();
});

beforeEach(async () => {
  // Crear un usuario de prueba en la DB
  testUser = await User.create({
    email: 'user@example.com',
    password: 'hashedpassword',
    name: 'Test User',
    role: 'business',
  });

  // Generar token real
  accessToken = generateAccessToken(testUser._id.toString(), testUser.role);
});

afterEach(async () => {
  await User.deleteMany({});
});

describe('GET /users/:id', () => {
  const endpoint = (id: string) => `/users/${id}`;

  it('✅ Devuelve correctamente un usuario existente', async () => {
    const res = await request(app)
      .get(endpoint(testUser._id.toString()))
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data._id).toBe(testUser._id.toString());
    expect(res.body.data.email).toBe(testUser.email);
    expect(res.body.data.name).toBe(testUser.name);
    expect(res.body.data).not.toHaveProperty('password');
  });

  it('❌ Devuelve 404 si el usuario no existe', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app)
      .get(endpoint(fakeId.toString()))
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(404);
    expect(res.body.message).toBe('User not found');
  });

  it('❌ Devuelve error con ID inválido (mal formado)', async () => {
    const res = await request(app)
      .get(endpoint('123-invalid-id'))
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(500); // o 400 si manejas errores de validación de ObjectId
    expect(res.body.success).toBe(false);
  });

  it('❌ Devuelve 401 si no se envía token', async () => {
    const res = await request(app).get(endpoint(testUser._id.toString()));
    expect(res.status).toBe(401); // o 403, según cómo lo manejes
  });
});
