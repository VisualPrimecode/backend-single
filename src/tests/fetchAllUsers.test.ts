import request from 'supertest';
import mongoose from 'mongoose';
import app from '../app';
import User from '../models/User';
import redisClient from '../config/redis';
import { generateAccessToken } from '../utils/token';

let accessToken: string;

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  await mongoose.connect(process.env.MONGO_URI_TEST as string);

  // Crear múltiples usuarios
  await User.insertMany([
    { name: 'Alice Smith', email: 'alice@example.com', password: 'password1', role: 'business' },
    { name: 'Bob Jones', email: 'bob@example.com', password: 'password2', role: 'business' },
    { name: 'Charlie Doe', email: 'charlie@example.com', password: 'password3', role: 'admin' },
  ]);

  const adminUser = await User.findOne({ email: 'charlie@example.com' });
  accessToken = generateAccessToken(adminUser!._id.toString(), adminUser!.role);
});

afterAll(async () => {
  await mongoose.connection.db.dropDatabase();
  await mongoose.disconnect();
});

afterEach(async () => {
  await redisClient.flushAll(); // limpia el caché después de cada test
});

describe('GET /users', () => {
  const endpoint = '/users';

  it('✅ Devuelve todos los usuarios sin parámetros', async () => {
    const res = await request(app)
      .get(endpoint)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.users.length).toBeGreaterThan(0);
    expect(res.body.data.totalCount).toBeDefined();
  });

  it('✅ Devuelve resultados con búsqueda por nombre', async () => {
    const res = await request(app)
      .get(`${endpoint}?search=Alice`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.users.length).toBeGreaterThan(0);
    expect(res.body.data.users[0].name).toMatch(/Alice/i);
  });

  it('✅ Paginación: devuelve 1 usuario por página', async () => {
    const res = await request(app)
      .get(`${endpoint}?page=1&limit=1`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.users.length).toBe(1);
    expect(res.body.data.totalPages).toBeGreaterThanOrEqual(3);
  });

  it('✅ Usa caché cuando está disponible', async () => {
    const cacheKey = 'users-page-1-search-';
    const cachedData = {
      users: [{ name: 'Cached User', email: 'cached@example.com' }],
      totalCount: 1,
      totalPages: 1,
    };

    await redisClient.set(cacheKey, JSON.stringify(cachedData));

    const res = await request(app)
      .get(endpoint)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/cache/i);
    expect(res.body.data.users[0].email).toBe('cached@example.com');
  });

  it('❌ Error del servidor se maneja correctamente', async () => {
    const original = User.find;
    // Simula error
    User.find = () => {
      throw new Error('Simulated DB failure');
    };

    const res = await request(app)
      .get(endpoint)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/Error fetching users/i);

    // Restaurar
    User.find = original;
  });
});
