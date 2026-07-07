import request from 'supertest';
import app from '../src/app';
import * as db from './db';
import { User } from '../src/models/User';

beforeAll(async () => await db.connect());
afterEach(async () => await db.clear());
afterAll(async () => await db.close());

describe('Auth Endpoints', () => {
  const mockUser = {
    name: 'Test Owner',
    email: 'owner@safarplug.com',
    phone: '9876543210',
    password: 'password123',
    userType: 'station_owner',
  };

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send(mockUser);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe(mockUser.email);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.user.passwordHash).toBeUndefined(); // Should not return passwordHash
    });

    it('should prevent registration with duplicate email', async () => {
      await request(app).post('/api/auth/register').send(mockUser);
      const res = await request(app).post('/api/auth/register').send(mockUser);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      await request(app).post('/api/auth/register').send(mockUser);
    });

    it('should login successfully with valid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: mockUser.email,
          password: mockUser.password,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
    });

    it('should fail login with invalid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: mockUser.email,
          password: 'wrongpassword',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/auth/me', () => {
    it('should deny access without a token', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });
});
