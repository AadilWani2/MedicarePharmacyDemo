const request = require('supertest');
const app = require('../index');
const { setupTestDB, teardownTestDB, clearDatabase, createTestUser } = require('./setup');
const Medicine = require('../models/Medicine');
const Supplier = require('../models/Supplier');
const Purchase = require('../models/Purchase');

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

describe('Purchase API Endpoints', () => {
  let token, supplier, medicine;

  beforeEach(async () => {
    const userDetails = await createTestUser({ role: 'admin' });
    token = userDetails.token;

    supplier = await Supplier.create({
      name: 'Max Pharmaceuticals',
      contactPerson: 'John Doe',
      email: 'john@maxpharma.com',
      phone: '9876543210',
      address: 'Industrial Area, Srinagar'
    });

    medicine = await Medicine.create({
      name: 'Ibuprofen 400mg',
      genericName: 'Ibuprofen',
      category: 'Tablets',
      manufacturer: 'Max Pharma',
      batchNumber: 'IBU777',
      purchasePrice: 20,
      sellingPrice: 30,
      quantity: 50,
      reorderLevel: 10,
      expiryDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
      hsnCode: '30049099',
      gstRate: 12
    });
  });

  describe('POST /api/purchases', () => {
    it('should create a purchase, generate invoice number, and add to stock', async () => {
      const res = await request(app)
        .post('/api/purchases')
        .set('Authorization', `Bearer ${token}`)
        .send({
          supplier: supplier._id,
          items: [{
            medicine: medicine._id,
            medicineName: medicine.name,
            quantity: 30,
            purchasePrice: 20
          }],
          discount: 10,
          paymentMethod: 'bank_transfer',
          notes: 'Regular monthly order'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.purchase.invoiceNumber).toBeDefined();
      expect(res.body.purchase.invoiceNumber).toContain('PUR-');
      expect(res.body.purchase.netAmount).toBe(590); // (30 * 20) - 10

      // Verify stock addition
      const updatedMedicine = await Medicine.findById(medicine._id);
      expect(updatedMedicine.quantity).toBe(80); // 50 + 30
    });
  });

  describe('GET /api/purchases', () => {
    it('should fetch list of purchases', async () => {
      const { user } = await createTestUser();
      
      await Purchase.create({
        invoiceNumber: 'PUR-202606-001',
        supplier: supplier._id,
        items: [{
          medicine: medicine._id,
          medicineName: medicine.name,
          quantity: 10,
          purchasePrice: 20,
          totalPrice: 200
        }],
        totalAmount: 200,
        netAmount: 200,
        createdBy: user._id
      });

      const res = await request(app)
        .get('/api/purchases')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.purchases.length).toBe(1);
    });
  });

  describe('GET /api/purchases/:id', () => {
    it('should fetch single purchase details', async () => {
      const { user } = await createTestUser();

      const created = await Purchase.create({
        invoiceNumber: 'PUR-202606-002',
        supplier: supplier._id,
        items: [{
          medicine: medicine._id,
          medicineName: medicine.name,
          quantity: 10,
          purchasePrice: 20,
          totalPrice: 200
        }],
        totalAmount: 200,
        netAmount: 200,
        createdBy: user._id
      });

      const res = await request(app)
        .get(`/api/purchases/${created._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.purchase.invoiceNumber).toBe('PUR-202606-002');
    });

    it('should return 404 if purchase not found', async () => {
      const fakeId = '654321098765432109876543';

      const res = await request(app)
        .get(`/api/purchases/${fakeId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
    });
  });
});
