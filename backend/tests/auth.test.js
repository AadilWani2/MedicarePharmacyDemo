const request = require('supertest');
const app = require('../index');
const { setupTestDB, teardownTestDB, clearDatabase, createTestUser } = require('./setup');
const User = require('../models/User');

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  await setupTestDB();
});

afterAll(async () => {
  await teardownTestDB();
});

beforeEach(async () => {
  await clearDatabase();
});

describe('Auth API Endpoints', () => {
  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'New Pharmacist',
          email: 'pharmacist@test.com',
          password: 'Password123!'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.name).toBe('New Pharmacist');
      expect(res.body.user.email).toBe('pharmacist@test.com');
      expect(res.body.user.role).toBe('staff'); // default role is staff in controller
      
      const userInDb = await User.findOne({ email: 'pharmacist@test.com' });
      expect(userInDb).toBeTruthy();
    });

    it('should fail registration with invalid input', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: '',
          email: 'invalid-email',
          password: 'short'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should prevent registering duplicate email', async () => {
      await User.create({
        name: 'Existing User',
        email: 'exist@test.com',
        password: 'Password123!'
      });

      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Another User',
          email: 'exist@test.com',
          password: 'Password123!'
        });

      expect(res.status).toBe(409); // conflict
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Email already registered');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login an active user with correct credentials', async () => {
      await User.create({
        name: 'Login Test',
        email: 'login@test.com',
        password: 'Password123!'
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'login@test.com',
          password: 'Password123!'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.accessToken).toBeDefined();
      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toBe('login@test.com');
    });

    it('should fail login with incorrect password', async () => {
      await User.create({
        name: 'Login Test',
        email: 'login@test.com',
        password: 'Password123!'
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'login@test.com',
          password: 'WrongPassword'
        });

      expect(res.status).toBe(401); // unauthorized
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Invalid credentials');
    });
  });

  describe('GET /api/auth/profile', () => {
    it('should return profile for authenticated user', async () => {
      const { user, token } = await createTestUser();

      const res = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user.email).toBe(user.email);
    });

    it('should return 401 when no token is provided', async () => {
      const res = await request(app)
        .get('/api/auth/profile');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should logout user and invalidate token', async () => {
      const { token } = await createTestUser();

      const res = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});
