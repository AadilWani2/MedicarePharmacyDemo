const request = require('supertest');
const app = require('../index');
const { setupTestDB, teardownTestDB, clearDatabase, createTestUser } = require('./setup');
const Medicine = require('../models/Medicine');
const Sale = require('../models/Sale');

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

describe('Sale API Endpoints', () => {
  let token, adminUser, medicine;

  beforeEach(async () => {
    const userDetails = await createTestUser({ role: 'admin' });
    token = userDetails.token;
    adminUser = userDetails.user;

    medicine = await Medicine.create({
      name: 'Amoxicillin 250mg',
      genericName: 'Amoxicillin',
      category: 'Capsules',
      manufacturer: 'Abbott',
      batchNumber: 'B9999',
      purchasePrice: 40,
      sellingPrice: 50,
      quantity: 10,
      reorderLevel: 2,
      expiryDate: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000),
      hsnCode: '30049099',
      gstRate: 12
    });
  });

  describe('POST /api/sales', () => {
    it('should create a sale successfully and deduct stock (intra-state)', async () => {
      const res = await request(app)
        .post('/api/sales')
        .set('Authorization', `Bearer ${token}`)
        .send({
          customerName: 'Aadil Wani',
          customerPhone: '9906123456',
          items: [{
            medicine: medicine._id,
            medicineName: medicine.name,
            quantity: 2,
            unitPrice: 50
          }],
          discount: 0,
          paymentMethod: 'cash',
          isInterState: false
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.sale.totalAmount).toBe(100);
      expect(res.body.sale.items.length).toBe(1);

      // Verify GST Calculations: Selling price = 50 inclusive of GST.
      // Total price = 100.
      // Taxable amount = 100 / (1 + 12/100) = 89.29
      // Total GST = 100 - 89.29 = 10.71
      // CGST = 10.71 / 2 = 5.36 (approx) and SGST = 10.71 - 5.36 = 5.35
      expect(res.body.sale.totalTaxableAmount).toBeCloseTo(89.29, 1);
      expect(res.body.sale.totalGST).toBeCloseTo(10.71, 1);
      expect(res.body.sale.totalCGST).toBeCloseTo(5.36, 1);
      expect(res.body.sale.totalSGST).toBeCloseTo(5.35, 1);
      expect(res.body.sale.totalIGST).toBe(0);

      // Verify stock deduction
      const updatedMedicine = await Medicine.findById(medicine._id);
      expect(updatedMedicine.quantity).toBe(8);
    });

    it('should calculate IGST for interstate sale', async () => {
      const res = await request(app)
        .post('/api/sales')
        .set('Authorization', `Bearer ${token}`)
        .send({
          customerName: 'Delhi Client',
          customerPhone: '9812345678',
          items: [{
            medicine: medicine._id,
            medicineName: medicine.name,
            quantity: 2,
            unitPrice: 50
          }],
          discount: 0,
          paymentMethod: 'upi',
          isInterState: true
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.sale.totalIGST).toBeCloseTo(10.71, 1);
      expect(res.body.sale.totalCGST).toBe(0);
      expect(res.body.sale.totalSGST).toBe(0);
    });

    it('should fail if requested quantity is greater than stock', async () => {
      const res = await request(app)
        .post('/api/sales')
        .set('Authorization', `Bearer ${token}`)
        .send({
          customerName: 'Greedy Buyer',
          items: [{
            medicine: medicine._id,
            medicineName: medicine.name,
            quantity: 20, // only 10 available
            unitPrice: 50
          }],
          paymentMethod: 'cash'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Insufficient stock');
    });
  });

  describe('GET /api/sales', () => {
    it('should get paginated list of sales', async () => {
      // Create a sale directly
      await Sale.create({
        billNumber: 'SAL-202606-001',
        items: [{
          medicine: medicine._id,
          medicineName: medicine.name,
          quantity: 1,
          unitPrice: 50,
          totalPrice: 50
        }],
        subtotal: 50,
        totalAmount: 50,
        paymentMethod: 'cash',
        soldBy: adminUser._id
      });

      const res = await request(app)
        .get('/api/sales')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.sales.length).toBe(1);
    });
  });

  describe('DELETE /api/sales/:id', () => {
    it('should delete sale and restore stock', async () => {
      const createdSale = await Sale.create({
        billNumber: 'SAL-202606-002',
        items: [{
          medicine: medicine._id,
          medicineName: medicine.name,
          quantity: 3,
          unitPrice: 50,
          totalPrice: 150
        }],
        subtotal: 150,
        totalAmount: 150,
        paymentMethod: 'cash',
        soldBy: adminUser._id
      });

      // Deduct stock for sale creation manually since we bypassed controller create
      await Medicine.findByIdAndUpdate(medicine._id, { $inc: { quantity: -3 } });

      const res = await request(app)
        .delete(`/api/sales/${createdSale._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify stock was restored (10 - 3 + 3 = 10)
      const restoredMedicine = await Medicine.findById(medicine._id);
      expect(restoredMedicine.quantity).toBe(10);

      // Verify sale deleted from DB
      const deletedSale = await Sale.findById(createdSale._id);
      expect(deletedSale).toBeNull();
    });
  });
});
