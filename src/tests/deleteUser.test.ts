
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../app';
import User from '../models/User';
import { generateAccessToken } from '../utils/token';

let userToDelete: any;
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
  // Crear usuario para borrar
  userToDelete = await User.create({
    email: 'delete.me@example.com',
    password: 'securepassword',
    name: 'To Delete',
    role: 'business',
  });

  accessToken = generateAccessToken(userToDelete._id.toString(), userToDelete.role);
});

afterEach(async () => {
  await User.deleteMany({});
});

describe('DELETE /users/:id', () => {
  const endpoint = (id: string) => `/users/${id}`;

  it('✅ Elimina correctamente un usuario existente', async () => {
    const res = await request(app)
      .delete(endpoint(userToDelete._id.toString()))
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('User deleted successfully');

    // Confirmar que el usuario ya no existe
    const check = await User.findById(userToDelete._id);
    expect(check).toBeNull();
  });

  it('❌ Retorna 404 si el usuario no existe', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app)
      .delete(endpoint(fakeId.toString()))
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('User not found');
  });

  it('❌ Retorna error si el ID es inválido', async () => {
    const res = await request(app)
      .delete(endpoint('invalid-id'))
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(500); // o 400 si manejas validación
    expect(res.body.success).toBe(false);
  });

  it('❌ Requiere token de autenticación', async () => {
    const res = await request(app).delete(endpoint(userToDelete._id.toString()));

    expect(res.status).toBe(401); // o 403 si tu middleware lo define así
    expect(res.body.success).toBe(false);
  });
});
