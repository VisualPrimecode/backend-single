// Set environment variables before any imports
process.env.NODE_ENV = 'test';
process.env.MONGO_URI_TEST = 'mongodb://127.0.0.1:27017/saas-db-test';
process.env.JWT_SECRET = 'testsecret';
process.env.JWT_REFRESH_SECRET = 'testrefreshsecret';



import request from 'supertest';
import mongoose from 'mongoose';
import app from '../app'; 
import User from '../models/User';
import { generateRefreshToken } from '../utils/token';


describe('User API Routes with Test Database', () => {
  let adminToken: string;
  let userToken: string;
  let userId: string;

  // Before all tests, connect to the test database and clean up
  beforeAll(async () => {
    await mongoose.connect(process.env.MONGO_URI_TEST as string);
    await User.deleteMany({});
  });

  // After all tests, clean up and disconnect
  afterAll(async () => {
    await User.deleteMany({});
    await mongoose.disconnect();
  });

  describe('POST /api/v1/users/register', () => {
    it('should return 400 when required fields are missing', async () => {
      const res = await request(app)
        .post('/api/v1/users/register')
        .send({ email: 'test@example.com' });
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('message', 'All fields are required');
    });

    it('should register an admin user', async () => {
      const res = await request(app)
        .post('/api/v1/users/register')
        .send({
          email: 'admin@example.com',
          password: 'AdminPass123',
          name: 'Admin User',
          role: 'admin'
        });
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('data');
      // Check that _id exists in data (it should not be null)
      expect(res.body.data).toHaveProperty('_id');
      
      // Login admin to get token; note that login response wraps tokens in data
      const loginRes = await request(app)
        .post('/api/v1/users/login')
        .send({ email: 'admin@example.com', password: 'AdminPass123' });
      expect(loginRes.status).toBe(200);
      expect(loginRes.body.data).toHaveProperty('accessToken');
      adminToken = loginRes.body.data.accessToken;
    });

    it('should return 400 when role is invalid', async () => {
      const res = await request(app)
        .post('/api/v1/users/register')
        .send({
          email: 'valid@example.com',
          password: 'ValidPass123',
          name: 'Test User',
          role: 'invalidRole' // not 'admin' or 'business'
        });
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('message', 'Invalid role');
    });

    it('should return 400 when email format is invalid', async () => {
      const res = await request(app)
        .post('/api/v1/users/register')
        .send({
          email: 'invalid-email', // invalid format
          password: 'ValidPass123',
          name: 'Test User',
          role: 'admin'
        });
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('message', 'Invalid email format');
    });

    it('should register a regular (business) user', async () => {
      const res = await request(app)
        .post('/api/v1/users/register')
        .send({
          email: 'user@example.com',
          password: 'UserPass123',
          name: 'Regular User',
          role: 'business'
        });
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toHaveProperty('_id');
      userId = res.body.data._id;
      
      // Login regular user to get token
      const loginRes = await request(app)
        .post('/api/v1/users/login')
        .send({ email: 'user@example.com', password: 'UserPass123' });
      expect(loginRes.status).toBe(200);
      expect(loginRes.body.data).toHaveProperty('accessToken');
      userToken = loginRes.body.data.accessToken;
    });
  });

  describe('POST /api/v1/users/login', () => {
    it('should return 400 if email or password is missing', async () => {
      const res = await request(app)
        .post('/api/v1/users/login')
        .send({ email: 'admin@example.com' });
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('message', 'Email and password required');
    });

    it('should login successfully with valid credentials', async () => {
      const res = await request(app)
        .post('/api/v1/users/login')
        .send({ email: 'admin@example.com', password: 'AdminPass123' });
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('accessToken');
    });
  });

  describe('GET /api/v1/users', () => {
    it('should deny access to non-admin users', async () => {
      const res = await request(app)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${userToken}`);
      // Since the auth middleware returns "Invalid token" if token is invalid,
      // with correct env variables the token should be valid and roleMiddleware should check role.
      // Expect Forbidden (403) from roleMiddleware.
      expect(res.status).toBe(403);
      expect(res.body).toHaveProperty('message', 'Forbidden');
    });

    it('should fetch all users for an admin user', async () => {
      const res = await request(app)
        .get('/api/v1/users?page=1&limit=10')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('GET /api/v1/users/:id', () => {
    it('should fetch a user by id', async () => {
      const res = await request(app)
        .get(`/api/v1/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('_id', userId);
    });

    it('should return 404 for a non-existent user', async () => {
      const res = await request(app)
        .get(`/api/v1/users/612345678901234567890123`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('message', 'User not found');
    });
  });

  describe('PUT /api/v1/users/:id', () => {
    it('should update user details', async () => {
      const res = await request(app)
        .put(`/api/v1/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Updated Regular User' });
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('name', 'Updated Regular User');
    });
  });

  describe('DELETE /api/v1/users/:id', () => {
    it('should delete a user as admin', async () => {
      const res = await request(app)
        .delete(`/api/v1/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('message', 'User deleted successfully');
    });
  });

  describe('POST /api/v1/users/logout', () => {
    it('should logout a user successfully', async () => {
      const res = await request(app)
        .post('/api/v1/users/logout')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('message', 'User logged out successfully');
    });
  });


  describe('Refresh Access Token Endpoint', () => {
    let testUser: any;
    let refreshToken: string;
  
    // Connect to test DB and create a test user
    beforeAll(async () => {
      // Create a test user (password is irrelevant here)
      testUser = new User({
        email: 'refresh@test.com',
        password: 'hashed', 
        name: 'Refresh Test User',
        role: 'business'
      });
      await testUser.save();
      // Generate a valid refresh token for the test user
      refreshToken = generateRefreshToken(testUser._id.toString());
    });
  
  
    it('should return 401 if refresh token is not provided', async () => {
      const res = await request(app)
        .post('/api/v1/users/refresh-token')
        .send({});
      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('message', 'Refresh token not provided');
    });
  
    it('should return 403 if refresh token is invalid', async () => {
      const res = await request(app)
        .post('/api/v1/users/refresh-token')
        .send({ refreshToken: 'invalidtoken' });
      expect(res.status).toBe(403);
      expect(res.body).toHaveProperty('message', 'Invalid refresh token');
    });
  
    it('should return 404 if user is not found', async () => {
      // Generate a valid refresh token for a non-existent user
      const fakeUserId = new mongoose.Types.ObjectId();
      const fakeRefreshToken = generateRefreshToken(fakeUserId.toString());
      const res = await request(app)
        .post('/api/v1/users/refresh-token')
        .send({ refreshToken: fakeRefreshToken });
      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('message', 'User not found');
    });
  
    it('should return a new access token for a valid refresh token', async () => {
      const res = await request(app)
        .post('/api/v1/users/refresh-token')
        .send({ refreshToken });
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toHaveProperty('accessToken');
    });
  });
  


});
