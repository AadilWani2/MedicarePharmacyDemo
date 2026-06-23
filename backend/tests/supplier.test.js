const request = require('supertest');
const app = require('../index');
const { setupTestDB, teardownTestDB, clearDatabase, createTestUser } = require('./setup');
const Supplier = require('../models/Supplier');

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

describe('Supplier API Endpoints', () => {
  let token;
  const sampleSupplier = {
    name: 'Kashmir Biotech',
    contactPerson: 'Fayaz Ahmad',
    email: 'fayaz@kashmirbiotech.com',
    phone: '9419012345',
    address: 'Lal Chowk, Srinagar',
    paymentTerms: 'net30',
    gstNumber: '01AAAAA0000A1Z1'
  };

  beforeEach(async () => {
    const userDetails = await createTestUser({ role: 'admin' });
    token = userDetails.token;
  });

  describe('POST /api/suppliers', () => {
    it('should create supplier successfully', async () => {
      const res = await request(app)
        .post('/api/suppliers')
        .set('Authorization', `Bearer ${token}`)
        .send(sampleSupplier);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.supplier.name).toBe(sampleSupplier.name);
    });
  });

  describe('GET /api/suppliers', () => {
    it('should list all suppliers', async () => {
      await Supplier.create(sampleSupplier);

      const res = await request(app)
        .get('/api/suppliers')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.suppliers.length).toBe(1);
    });

    it('should filter suppliers by search query', async () => {
      await Supplier.create(sampleSupplier);
      await Supplier.create({
        ...sampleSupplier,
        name: 'Jammu Pharma',
        phone: '1910000000'
      });

      const res = await request(app)
        .get('/api/suppliers?search=Jammu')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.suppliers.length).toBe(1);
      expect(res.body.suppliers[0].name).toBe('Jammu Pharma');
    });
  });

  describe('GET /api/suppliers/:id', () => {
    it('should fetch single supplier by ID', async () => {
      const created = await Supplier.create(sampleSupplier);

      const res = await request(app)
        .get(`/api/suppliers/${created._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.supplier.name).toBe(sampleSupplier.name);
    });

    it('should return 404 for invalid ID', async () => {
      const fakeId = '654321098765432109876543';

      const res = await request(app)
        .get(`/api/suppliers/${fakeId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
    });
  });

  describe('PUT /api/suppliers/:id', () => {
    it('should update supplier data', async () => {
      const created = await Supplier.create(sampleSupplier);

      const res = await request(app)
        .put(`/api/suppliers/${created._id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          ...sampleSupplier,
          contactPerson: 'Fayaz Ahmad Wani',
          rating: 4.5
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.supplier.contactPerson).toBe('Fayaz Ahmad Wani');
      expect(res.body.supplier.rating).toBe(4.5);
    });
  });

  describe('DELETE /api/suppliers/:id', () => {
    it('should delete supplier permanently', async () => {
      const created = await Supplier.create(sampleSupplier);

      const res = await request(app)
        .delete(`/api/suppliers/${created._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const checkDb = await Supplier.findById(created._id);
      expect(checkDb).toBeNull();
    });
  });
});
