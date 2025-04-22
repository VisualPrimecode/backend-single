// Set environment variables before any imports
process.env.NODE_ENV = 'test';
process.env.MONGO_URI_TEST = 'mongodb://127.0.0.1:27017/saas-db-test';
process.env.JWT_SECRET = 'testsecret';
process.env.JWT_REFRESH_SECRET = 'testrefreshsecret';

import request from 'supertest';
import mongoose from 'mongoose';
import app from '../app';
import Business from '../models/Business';
import User from '../models/User';
import bcrypt from 'bcryptjs';

describe('Business API Routes with Test Database', () => {
  let ownerId: string;
  let businessId: string;
  let accessToken: string;

  beforeAll(async () => {
    await mongoose.connect(process.env.MONGO_URI_TEST as string);

    await Business.deleteMany({});
    await User.deleteMany({});

    const hashedPassword = await bcrypt.hash('hashedpassword', 10);
    // Create dummy admin user
    const testOwner = new User({
      email: 'owner@test.com',
      password: hashedPassword,
      name: 'Test Owner',
      role: 'admin',
    });
    await testOwner.save();
    ownerId = testOwner._id.toString();

    // Log in to get access token
    const loginRes = await request(app)
      .post('/api/v1/users/login')
      .send({ email: 'owner@test.com', password: 'hashedpassword' });
    console.log('LOGIN RESPONSE', loginRes.status, loginRes.body);
    accessToken = loginRes.body.data.accessToken;
  });

  afterAll(async () => {
    await Business.deleteMany({});
    await User.deleteMany({});
    await mongoose.disconnect();
  });

  describe('POST /api/v1/business', () => {
    it('should create a new business', async () => {
      const res = await request(app)
        .post('/api/v1/business')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Test Business',
          owner: ownerId,
          industry: 'Tech',
          businessType: 'b2b',
          platform: 'Web',
          supportSize: 'Large',
          supportChannels: ['email', 'phone'],
          websiteTraffic: '10000',
          monthlyConversations: '500',
          goals: ['increase sales', 'improve support'],
          subscriptionPlan: 'pro',
          aiIntegrations: {
            website: true,
            whatsapp: false,
            api: true,
            integrationDetails: {},
          },
          analytics: {
            totalTickets: 100,
            resolvedTickets: 90,
            avgResponseTime: 5,
            customerSatisfaction: 80,
          },
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toHaveProperty('_id');
      businessId = res.body.data._id;
    });
  });

  describe('GET /api/v1/business', () => {
    it('should fetch all businesses with pagination', async () => {
      const res = await request(app)
        .get('/api/v1/business?page=1&limit=10')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('GET /api/v1/business/:id', () => {
    it('should fetch a business by id', async () => {
      const res = await request(app)
        .get(`/api/v1/business/${businessId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('_id', businessId);
    });

    it('should return 404 for a non-existent business', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();

      const res = await request(app)
        .get(`/api/v1/business/${fakeId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('message', 'Business not found');
    });
  });

  describe('PUT /api/v1/business/:id', () => {
    it('should update business details', async () => {
      const res = await request(app)
        .put(`/api/v1/business/${businessId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Updated Business Name' });

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('name', 'Updated Business Name');
    });
  });

  describe('DELETE /api/v1/business/:id', () => {
    it('should delete a business', async () => {
      const res = await request(app)
        .delete(`/api/v1/business/${businessId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('message', 'Business deleted successfully');
    });
  });
});
