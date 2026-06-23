const request = require('supertest');
const app = require('../index');
const { setupTestDB, teardownTestDB, clearDatabase, createTestUser } = require('./setup');
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

describe('Medicine API Endpoints', () => {
  const sampleMedicine = {
    name: 'Paracetamol 500mg',
    genericName: 'Paracetamol',
    category: 'Tablets',
    manufacturer: 'Cipla Ltd',
    batchNumber: 'B12345',
    purchasePrice: 10,
    sellingPrice: 15,
    quantity: 100,
    reorderLevel: 20,
    expiryDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 days from now
    hsnCode: '30049099',
    gstRate: 12
  };

  describe('POST /api/medicines', () => {
    it('should create a new medicine successfully as admin', async () => {
      const { token } = await createTestUser({ role: 'admin' });

      const res = await request(app)
        .post('/api/medicines')
        .set('Authorization', `Bearer ${token}`)
        .send(sampleMedicine);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.medicine.name).toBe(sampleMedicine.name);
      expect(res.body.medicine.batchNumber).toBe(sampleMedicine.batchNumber);
    });

    it('should allow pharmacist to create a new medicine', async () => {
      const { token } = await createTestUser({ role: 'pharmacist' });

      const res = await request(app)
        .post('/api/medicines')
        .set('Authorization', `Bearer ${token}`)
        .send(sampleMedicine);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it('should return 400 for duplicate batch number', async () => {
      const { token } = await createTestUser({ role: 'admin' });

      await Medicine.create(sampleMedicine);

      const res = await request(app)
        .post('/api/medicines')
        .set('Authorization', `Bearer ${token}`)
        .send(sampleMedicine);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/medicines', () => {
    it('should get paginated list of medicines', async () => {
      const { token } = await createTestUser();
      await Medicine.create(sampleMedicine);

      const res = await request(app)
        .get('/api/medicines')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.medicines.length).toBe(1);
      expect(res.body.pagination).toBeDefined();
    });
  });

  describe('GET /api/medicines/:id', () => {
    it('should fetch single medicine details', async () => {
      const { token } = await createTestUser();
      const createdMed = await Medicine.create(sampleMedicine);

      const res = await request(app)
        .get(`/api/medicines/${createdMed._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.medicine.name).toBe(sampleMedicine.name);
    });

    it('should return 404 if medicine not found', async () => {
      const { token } = await createTestUser();
      const fakeId = '654321098765432109876543';

      const res = await request(app)
        .get(`/api/medicines/${fakeId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('PUT /api/medicines/:id', () => {
    it('should update medicine details', async () => {
      const { token } = await createTestUser({ role: 'admin' });
      const createdMed = await Medicine.create(sampleMedicine);

      const res = await request(app)
        .put(`/api/medicines/${createdMed._id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          ...sampleMedicine,
          sellingPrice: 18,
          quantity: 120
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.medicine.sellingPrice).toBe(18);
      expect(res.body.medicine.quantity).toBe(120);
    });
  });

  describe('DELETE /api/medicines/:id', () => {
    it('should soft delete medicine as admin', async () => {
      const { token } = await createTestUser({ role: 'admin' });
      const createdMed = await Medicine.create(sampleMedicine);

      const res = await request(app)
        .delete(`/api/medicines/${createdMed._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const deletedMed = await Medicine.findById(createdMed._id);
      expect(deletedMed.isActive).toBe(false);
    });

    it('should not allow non-admin to delete', async () => {
      const { token } = await createTestUser({ role: 'pharmacist' });
      const createdMed = await Medicine.create(sampleMedicine);

      const res = await request(app)
        .delete(`/api/medicines/${createdMed._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/medicines/search', () => {
    it('should return matching medicines by query', async () => {
      const { token } = await createTestUser();
      await Medicine.create(sampleMedicine);

      // Add text index helper manually in test if needed, but Mongoose schema has index({name: 'text'})
      // Wait, MongoDB memory server supports text index natively.
      const res = await request(app)
        .get('/api/medicines/search?q=Para')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.medicines.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('GET /api/medicines/expiring', () => {
    it('should return expiring medicines within window', async () => {
      const { token } = await createTestUser();
      
      // Expiring in 15 days
      await Medicine.create({
        ...sampleMedicine,
        batchNumber: 'B_EXPIRING',
        expiryDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000)
      });

      const res = await request(app)
        .get('/api/medicines/expiring?days=30')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.medicines.length).toBe(1);
    });
  });

  describe('POST /api/medicines/apply-discount', () => {
    it('should apply discount to expiring medicines in bulk', async () => {
      const { token } = await createTestUser({ role: 'admin' });
      
      const createdMed = await Medicine.create({
        ...sampleMedicine,
        batchNumber: 'B_DISC',
        expiryDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000)
      });

      const res = await request(app)
        .post('/api/medicines/apply-discount')
        .set('Authorization', `Bearer ${token}`)
        .send({
          percentage: 20,
          days: 30
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.updatedCount).toBe(1);

      const updated = await Medicine.findById(createdMed._id);
      expect(updated.discountApplied).toBe(true);
      expect(updated.sellingPrice).toBe(12); // 15 - 20%
    });
  });
});
