import request from 'supertest';
import mongoose from 'mongoose';
import app from '../app';
import User from '../models/User';
import { generateAccessToken } from '../utils/token';

let testUser: any;
let accessToken: string;

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  await mongoose.connect(process.env.MONGO_URI_TEST as string);
});

afterAll(async () => {
  await mongoose.connection.db.dropDatabase();
  await mongoose.disconnect();
});

beforeEach(async () => {
  // Crear usuario de prueba
  testUser = await User.create({
    email: 'editme@example.com',
    password: 'securepassword',
    name: 'Editable User',
    role: 'business',
  });

  accessToken = generateAccessToken(testUser._id.toString(), testUser.role);
});

afterEach(async () => {
  await User.deleteMany({});
});

describe('PUT /users/:id', () => {
  const endpoint = (id: string) => `/users/${id}`;

  it('✅ Actualiza correctamente un usuario existente', async () => {
    const res = await request(app)
      .put(endpoint(testUser._id.toString()))
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'Updated Name',
        email: 'updated@example.com',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('Updated Name');
    expect(res.body.data.email).toBe('updated@example.com');
  });

  it('❌ Retorna 404 si el usuario no existe', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app)
      .put(endpoint(fakeId.toString()))
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'No User' });

    expect(res.status).toBe(404);
    expect(res.body.message).toBe('User not found');
  });

  it('❌ Retorna error con ID inválido', async () => {
    const res = await request(app)
      .put(endpoint('invalid-id'))
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Test' });

    expect(res.status).toBe(500); // o 400 si haces validación previa
    expect(res.body.success).toBe(false);
  });

  it('❌ Retorna error si los campos son inválidos', async () => {
    const res = await request(app)
      .put(endpoint(testUser._id.toString()))
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ email: 'no-es-un-email' });

    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.body.success).toBe(false);
  });

  it('❌ Requiere token de autenticación', async () => {
    const res = await request(app)
      .put(endpoint(testUser._id.toString()))
      .send({ name: 'No Auth' });

    expect(res.status).toBe(401); // o 403, según tu middleware
    expect(res.body.success).toBe(false);
  });
});
