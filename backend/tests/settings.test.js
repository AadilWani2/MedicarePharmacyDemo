const request = require('supertest');
const app = require('../index');
const { setupTestDB, teardownTestDB, clearDatabase, createTestUser } = require('./setup');
const Settings = require('../models/Settings');

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

describe('Settings API Endpoints', () => {
  let token;

  beforeEach(async () => {
    const userDetails = await createTestUser({ role: 'admin' });
    token = userDetails.token;
  });

  describe('GET /api/settings', () => {
    it('should retrieve default settings if none exist', async () => {
      const res = await request(app)
        .get('/api/settings')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.settings.lowStockThreshold).toBe(20);
      expect(res.body.settings.expiryWarningDays).toBe(60);
    });
  });

  describe('PUT /api/settings', () => {
    it('should update settings successfully as admin', async () => {
      const res = await request(app)
        .put('/api/settings')
        .set('Authorization', `Bearer ${token}`)
        .send({
          lowStockThreshold: 15,
          expiryWarningDays: 45,
          pharmacyGSTIN: '01ABCDE1234F1Z5',
          pharmacyState: '01',
          pharmacyStateName: 'Jammu & Kashmir',
          defaultGSTRate: 12
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.settings.lowStockThreshold).toBe(15);
      expect(res.body.settings.expiryWarningDays).toBe(45);
      expect(res.body.settings.pharmacyGSTIN).toBe('01ABCDE1234F1Z5');
      expect(res.body.settings.defaultGSTRate).toBe(12);

      const dbSettings = await Settings.findOne();
      expect(dbSettings.lowStockThreshold).toBe(15);
    });

    it('should deny access to non-admin users', async () => {
      const { token: pharToken } = await createTestUser({ role: 'pharmacist' });

      const res = await request(app)
        .put('/api/settings')
        .set('Authorization', `Bearer ${pharToken}`)
        .send({
          lowStockThreshold: 10
        });

      expect(res.status).toBe(403);
    });
  });
});
