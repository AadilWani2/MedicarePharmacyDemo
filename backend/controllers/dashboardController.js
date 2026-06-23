const Medicine = require('../models/Medicine');
const Sale = require('../models/Sale');
const Purchase = require('../models/Purchase');
const Supplier = require('../models/Supplier');

exports.getStats = async (req, res) => {
  try {
    const [
      totalMedicines,
      totalStock,
      lowStock,
      expiring,
      totalSuppliers,
      todaySales,
      monthlyRevenue
    ] = await Promise.all([
      Medicine.countDocuments({ isActive: true }),
      Medicine.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: null, total: { $sum: '$quantity' } } }
      ]),
      Medicine.countDocuments({
        $expr: { $lte: ['$quantity', '$reorderLevel'] },
        isActive: true
      }),
      Medicine.countDocuments({
        expiryDate: { $lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
        isActive: true
      }),
      Supplier.countDocuments({ status: 'active' }),
      Sale.aggregate([
        { $match: { saleDate: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) } } },
        { $group: { _id: null, total: { $sum: '$totalAmount' }, count: { $sum: 1 } } }
      ]),
      Sale.aggregate([
        { $match: { saleDate: { $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) } } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ])
    ]);

    res.json({
      success: true,
      stats: {
        totalMedicines,
        totalStock: totalStock[0]?.total || 0,
        lowStock,
        expiringSoon: expiring,
        totalSuppliers,
        todaySales: todaySales[0]?.total || 0,
        todayTransactions: todaySales[0]?.count || 0,
        monthlyRevenue: monthlyRevenue[0]?.total || 0
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getAnalytics = async (req, res) => {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    // Fetch sales data
    // Fetch sales data for 30 days once, populating only purchasePrice and category
    const sales30Days = await Sale.find({ saleDate: { $gte: thirtyDaysAgo } })
      .populate('items.medicine', 'purchasePrice category');

    // Filter 7 days sales in-memory to save query time and resources
    const sales7Days = sales30Days.filter(sale => new Date(sale.saleDate) >= sevenDaysAgo);

    // 1. Sales Trend (Last 7 Days)
    const salesTrendMap = {};
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
      salesTrendMap[dateStr] = { date: dateStr, revenue: 0, profit: 0 };
    }

    sales7Days.forEach(sale => {
      const dateStr = new Date(sale.saleDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
      if (salesTrendMap[dateStr]) {
        salesTrendMap[dateStr].revenue += sale.totalAmount;
        
        let purchaseCost = 0;
        sale.items.forEach(item => {
          const purchasePrice = item.medicine ? item.medicine.purchasePrice : (item.unitPrice * 0.7);
          purchaseCost += item.quantity * purchasePrice;
        });

        // Deduct discount proportionally
        const discountProportion = sale.subtotal > 0 ? (sale.discount / sale.subtotal) : 0;
        const netCost = purchaseCost * (1 - discountProportion);
        const profit = sale.totalAmount - netCost;
        salesTrendMap[dateStr].profit += Math.max(0, Math.round(profit));
      }
    });
    const salesTrend = Object.values(salesTrendMap);

    // 2. Category Distribution (Last 30 Days)
    const categoryMap = {};
    sales30Days.forEach(sale => {
      sale.items.forEach(item => {
        const category = item.medicine ? item.medicine.category : 'General';
        if (!categoryMap[category]) {
          categoryMap[category] = 0;
        }
        categoryMap[category] += item.quantity;
      });
    });
    const categoryDistribution = Object.keys(categoryMap).map(cat => ({
      name: cat,
      value: categoryMap[cat]
    }));

    // 3. Top Selling Medicines (Last 30 Days)
    const medicineMap = {};
    sales30Days.forEach(sale => {
      sale.items.forEach(item => {
        const name = item.medicineName;
        if (!medicineMap[name]) {
          medicineMap[name] = { name, sales: 0, revenue: 0 };
        }
        medicineMap[name].sales += item.quantity;
        medicineMap[name].revenue += item.totalPrice;
      });
    });
    const topSellingMedicines = Object.values(medicineMap)
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 5);

    res.json({
      success: true,
      analytics: {
        salesTrend,
        categoryDistribution,
        topSellingMedicines
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};