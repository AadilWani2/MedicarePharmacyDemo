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

describe('Report API Endpoints', () => {
  let token, adminUser, medicine;

  beforeEach(async () => {
    const userDetails = await createTestUser({ role: 'admin' });
    token = userDetails.token;
    adminUser = userDetails.user;

    medicine = await Medicine.create({
      name: 'Vitamin C 500mg',
      genericName: 'Ascorbic Acid',
      category: 'Tablets',
      manufacturer: 'Abbott',
      batchNumber: 'VITC101',
      purchasePrice: 5,
      sellingPrice: 8,
      quantity: 15, // Below standard low stock of 20
      reorderLevel: 25,
      expiryDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // Expiring in 15 days
      hsnCode: '30049099',
      gstRate: 5
    });
  });

  describe('GET /api/reports/inventory', () => {
    it('should generate inventory report with correct total stock/value', async () => {
      const res = await request(app)
        .get('/api/reports/inventory')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.report.totalMedicines).toBe(1);
      expect(res.body.report.totalStock).toBe(15);
      expect(res.body.report.totalValue).toBe(120); // 15 * 8
    });
  });

  describe('GET /api/reports/sales', () => {
    it('should generate sales report and filter by dates', async () => {
      // Create a test sale
      await Sale.create({
        billNumber: 'SAL-202606-010',
        items: [{
          medicine: medicine._id,
          medicineName: medicine.name,
          quantity: 2,
          unitPrice: 8,
          totalPrice: 16
        }],
        subtotal: 16,
        totalAmount: 16,
        paymentMethod: 'cash',
        soldBy: adminUser._id,
        saleDate: new Date()
      });

      const todayStr = new Date().toISOString().split('T')[0];
      const tomorrowStr = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const res = await request(app)
        .get(`/api/reports/sales?startDate=${todayStr}&endDate=${tomorrowStr}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.report.totalSales).toBe(1);
      expect(res.body.report.totalRevenue).toBe(16);
    });
  });

  describe('GET /api/reports/expiry', () => {
    it('should return medicines expiring soon', async () => {
      const res = await request(app)
        .get('/api/reports/expiry')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.report.totalExpiring).toBe(1);
      expect(res.body.report.medicines[0].name).toBe('Vitamin C 500mg');
    });
  });

  describe('GET /api/reports/low-stock', () => {
    it('should return medicines with quantity below reorderLevel or lowStockThreshold', async () => {
      const res = await request(app)
        .get('/api/reports/low-stock')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.report.totalLowStock).toBe(1);
      expect(res.body.report.medicines[0].name).toBe('Vitamin C 500mg');
    });
  });
});
