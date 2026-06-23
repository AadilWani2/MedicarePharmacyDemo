const request = require('supertest');
const app = require('../index');
const { setupTestDB, teardownTestDB, clearDatabase, createTestUser } = require('./setup');
const AuditLog = require('../models/AuditLog');
const Medicine = require('../models/Medicine');

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

describe('Audit API Endpoints and Tracking', () => {
  let token, adminUser;

  beforeEach(async () => {
    const userDetails = await createTestUser({ role: 'admin' });
    token = userDetails.token;
    adminUser = userDetails.user;
  });

  it('should create an audit log entry on CRUD action and fetch them as admin', async () => {
    // 1. Create a medicine using the API
    const medRes = await request(app)
      .post('/api/medicines')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Metformin 500mg',
        genericName: 'Metformin',
        category: 'Tablets',
        manufacturer: 'USV Pvt Ltd',
        batchNumber: 'MET888',
        purchasePrice: 12,
        sellingPrice: 18,
        quantity: 100,
        reorderLevel: 20,
        expiryDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString()
      });

    expect(medRes.status).toBe(201);

    // 2. Fetch the audit logs as admin
    const auditRes = await request(app)
      .get('/api/audit')
      .set('Authorization', `Bearer ${token}`);

    expect(auditRes.status).toBe(200);
    expect(auditRes.body.success).toBe(true);
    expect(auditRes.body.logs.length).toBeGreaterThanOrEqual(1);

    const log = auditRes.body.logs[0];
    expect(log.action).toBe('CREATE');
    expect(log.entity).toBe('Medicine');
    expect(log.entityName).toBe('Metformin 500mg');
    expect(log.userName).toBe(adminUser.name);
  });

  it('should compute and log differences for updates', async () => {
    // 1. Create medicine
    const med = await Medicine.create({
      name: 'Metformin 500mg',
      genericName: 'Metformin',
      category: 'Tablets',
      manufacturer: 'USV Pvt Ltd',
      batchNumber: 'MET888',
      purchasePrice: 12,
      sellingPrice: 18,
      quantity: 100,
      reorderLevel: 20,
      expiryDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000)
    });

    // 2. Update medicine selling price and generic name via API
    const updateRes = await request(app)
      .put(`/api/medicines/${med._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Metformin 500mg',
        genericName: 'Metformin Hydrochloride',
        category: 'Tablets',
        manufacturer: 'USV Pvt Ltd',
        batchNumber: 'MET888',
        purchasePrice: 12,
        sellingPrice: 20, // changed
        quantity: 100,
        reorderLevel: 20,
        expiryDate: med.expiryDate.toISOString()
      });

    expect(updateRes.status).toBe(200);

    // 3. Query audit logs
    const auditRes = await request(app)
      .get('/api/audit')
      .set('Authorization', `Bearer ${token}`);

    expect(auditRes.body.logs.length).toBeGreaterThanOrEqual(1);
    const updateLog = auditRes.body.logs.find(l => l.action === 'UPDATE');
    expect(updateLog).toBeDefined();
    expect(updateLog.changes).toBeDefined();
    expect(updateLog.changes.sellingPrice).toEqual({ from: 18, to: 20 });
    expect(updateLog.changes.genericName).toEqual({ from: 'Metformin', to: 'Metformin Hydrochloride' });
  });

  it('should fetch audit statistics', async () => {
    // Create an audit entry manually
    await AuditLog.create({
      action: 'LOGIN',
      entity: 'User',
      entityName: adminUser.name,
      user: adminUser._id,
      userName: adminUser.name,
      details: 'Logged in successfully'
    });

    const res = await request(app)
      .get('/api/audit/stats')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.stats.totalLogs).toBeGreaterThanOrEqual(1);
    expect(res.body.stats.last7Days).toBeGreaterThanOrEqual(1);
  });

  it('should deny audit log access to non-admin', async () => {
    const { token: pharToken } = await createTestUser({ role: 'pharmacist' });

    const res = await request(app)
      .get('/api/audit')
      .set('Authorization', `Bearer ${pharToken}`);

    expect(res.status).toBe(403);
  });
});
