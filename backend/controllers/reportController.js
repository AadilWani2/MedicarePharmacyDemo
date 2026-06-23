const Medicine = require('../models/Medicine');
const Sale = require('../models/Sale');
const Purchase = require('../models/Purchase');
const { sendAlertEmail } = require('../utils/emailUtils');
const Settings = require('../models/Settings');

exports.getInventoryReport = async (req, res) => {
  try {
    const medicines = await Medicine.find({ isActive: true })
      .select('name genericName category batchNumber quantity reorderLevel expiryDate sellingPrice')
      .sort({ category: 1, name: 1 });
    
    const totalValue = medicines.reduce((sum, med) => sum + (med.quantity * med.sellingPrice), 0);
    const totalStock = medicines.reduce((sum, med) => sum + med.quantity, 0);
    
    res.json({
      success: true,
      report: {
        generatedAt: new Date(),
        totalMedicines: medicines.length,
        totalStock,
        totalValue,
        medicines
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getSalesReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    let dateFilter = {};
    if (startDate && endDate) {
      dateFilter = {
        saleDate: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      };
    }
    
    const sales = await Sale.find(dateFilter)
      .populate('soldBy', 'name')
      .sort({ saleDate: -1 });
    
    const totalRevenue = sales.reduce((sum, sale) => sum + sale.totalAmount, 0);
    
    res.json({
      success: true,
      report: {
        generatedAt: new Date(),
        totalSales: sales.length,
        totalRevenue,
        sales
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getExpiryReport = async (req, res) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) {
      settings = { expiryWarningDays: 60 };
    }
    
    const expiryWindow = new Date();
    expiryWindow.setDate(expiryWindow.getDate() + settings.expiryWarningDays);
    
    const medicines = await Medicine.find({
      expiryDate: { $lte: expiryWindow },
      isActive: true
    }).sort({ expiryDate: 1 });
    
    res.json({
      success: true,
      report: {
        generatedAt: new Date(),
        totalExpiring: medicines.length,
        medicines
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getLowStockReport = async (req, res) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) {
      settings = { lowStockThreshold: 20 };
    }

    const medicines = await Medicine.find({
      quantity: { $lte: settings.lowStockThreshold },
      isActive: true
    }).sort({ quantity: 1 });
    
    res.json({
      success: true,
      report: {
        generatedAt: new Date(),
        totalLowStock: medicines.length,
        medicines
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.triggerEmailAlerts = async (req, res) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) {
      settings = { expiryWarningDays: 60, lowStockThreshold: 20 };
    }

    const expiryWindow = new Date();
    expiryWindow.setDate(expiryWindow.getDate() + settings.expiryWarningDays);

    // Get low stock medicines
    const lowStockMedicines = await Medicine.find({
      quantity: { $lte: settings.lowStockThreshold },
      isActive: true
    }).sort({ quantity: 1 });

    // Get expiring medicines
    const expiringMedicines = await Medicine.find({
      expiryDate: { $lte: expiryWindow },
      isActive: true
    }).sort({ expiryDate: 1 });

    // Generate CSV content
    const headers = ['Alert Type', 'Medicine Name', 'Generic Name', 'Category', 'Batch Number', 'Stock Quantity', 'Reorder Level', 'Expiry Date', 'Selling Price'];
    const csvRows = [headers.join(',')];

    lowStockMedicines.forEach(med => {
      const row = [
        'LOW STOCK',
        med.name,
        med.genericName || 'N/A',
        med.category || 'N/A',
        med.batchNumber || 'N/A',
        med.quantity,
        med.reorderLevel,
        new Date(med.expiryDate).toLocaleDateString('en-IN'),
        med.sellingPrice
      ].map(val => `"${String(val).replace(/"/g, '""')}"`).join(',');
      csvRows.push(row);
    });

    expiringMedicines.forEach(med => {
      const row = [
        'EXPIRING SOON',
        med.name,
        med.genericName || 'N/A',
        med.category || 'N/A',
        med.batchNumber || 'N/A',
        med.quantity,
        med.reorderLevel,
        new Date(med.expiryDate).toLocaleDateString('en-IN'),
        med.sellingPrice
      ].map(val => `"${String(val).replace(/"/g, '""')}"`).join(',');
      csvRows.push(row);
    });

    const csvContent = csvRows.join('\n');

    // 1. Send email alert (concurrently)
    sendAlertEmail({
      lowStockItems: lowStockMedicines,
      expiringItems: expiringMedicines,
      csvContent
    })
    .then(() => console.log('✉️ Manual Email alert dispatched successfully.'))
     .catch(emailError => console.error('❌ Manual Email alert dispatch failed:', emailError.message));

    res.json({
      success: true,
      message: 'Alert dispatches triggered in the background! Delivery status will log in the server console.'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const { registerNotificationClient } = require('../utils/notificationUtils');

exports.streamNotifications = (req, res) => {
  registerNotificationClient(req, res);
};

exports.getSupplierReturnMemos = async (req, res) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) {
      settings = { expiryWarningDays: 60 };
    }
    
    const expiryWindow = new Date();
    expiryWindow.setDate(expiryWindow.getDate() + settings.expiryWarningDays);
    
    // Find expiring medicines
    const medicines = await Medicine.find({
      expiryDate: { $lte: expiryWindow },
      isActive: true,
      quantity: { $gt: 0 } // Only return items we actually have in stock
    }).sort({ expiryDate: 1 });
    
    const memoData = {};
    
    for (const med of medicines) {
      // Find the last purchase order for this medicine to identify the supplier
      const lastPurchase = await Purchase.findOne({ 'items.medicine': med._id })
        .sort({ purchaseDate: -1 })
        .populate('supplier');
        
      const supplierInfo = lastPurchase && lastPurchase.supplier 
        ? {
            id: lastPurchase.supplier._id,
            name: lastPurchase.supplier.name,
            email: lastPurchase.supplier.email,
            phone: lastPurchase.supplier.phone,
            paymentTerms: lastPurchase.supplier.paymentTerms
          }
        : {
            id: 'unknown',
            name: 'Unknown Supplier / Direct Purchase',
            email: 'N/A',
            phone: 'N/A',
            paymentTerms: 'N/A'
          };
          
      const key = supplierInfo.id.toString();
      if (!memoData[key]) {
        memoData[key] = {
          supplier: supplierInfo,
          items: []
        };
      }
      
      memoData[key].items.push({
        medicineId: med._id,
        name: med.name,
        genericName: med.genericName,
        batchNumber: med.batchNumber,
        quantity: med.quantity,
        purchasePrice: med.purchasePrice,
        expiryDate: med.expiryDate,
        totalValue: med.quantity * med.purchasePrice
      });
    }
    
    // Convert object to array
    const memos = Object.values(memoData);
    
    res.json({
      success: true,
      memos
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};