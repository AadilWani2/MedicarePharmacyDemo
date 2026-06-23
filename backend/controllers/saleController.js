const Sale = require('../models/Sale');
const Medicine = require('../models/Medicine');
const Settings = require('../models/Settings');
const { logAudit } = require('../middleware/auditMiddleware');

exports.getSales = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    
    const sales = await Sale.find()
      .populate('soldBy', 'name')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ saleDate: -1 });
    
    const total = await Sale.countDocuments();
    
    res.json({
      success: true,
      sales,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getSale = async (req, res) => {
  try {
    const sale = await Sale.findById(req.params.id)
      .populate('items.medicine')
      .populate('soldBy', 'name');
    
    if (!sale) {
      return res.status(404).json({ success: false, message: 'Sale not found' });
    }
    res.json({ success: true, sale });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createSale = async (req, res) => {
  try {
    const { customerName, customerPhone, customerGSTIN, items, discount, paymentMethod, isInterState } = req.body;
    
    // Generate bill number
    const billNumber = await Sale.generateBillNumber();

    // Fetch settings for pharmacy state
    let settings = await Settings.findOne();
    
    // Calculate totals with GST
    let subtotal = 0;
    let totalTaxableAmount = 0;
    let totalCGST = 0;
    let totalSGST = 0;
    let totalIGST = 0;
    let totalGST = 0;

    const saleItems = [];

    for (const item of items) {
      const medicine = await Medicine.findById(item.medicine);
      if (!medicine) {
        return res.status(404).json({ 
          success: false, 
          message: `Medicine ${item.medicineName} not found` 
        });
      }
      if (medicine.quantity < item.quantity) {
        return res.status(400).json({ 
          success: false, 
          message: `Insufficient stock for ${medicine.name}. Available: ${medicine.quantity}` 
        });
      }

      const totalPrice = item.quantity * item.unitPrice;
      subtotal += totalPrice;

      // GST calculation — prices are GST-inclusive (MRP includes GST)
      const gstRate = medicine.gstRate || 0;
      const taxableAmount = Math.round((totalPrice / (1 + gstRate / 100)) * 100) / 100;
      const gstAmount = Math.round((totalPrice - taxableAmount) * 100) / 100;

      let cgstAmount = 0, sgstAmount = 0, igstAmount = 0;
      if (isInterState) {
        igstAmount = gstAmount;
      } else {
        cgstAmount = Math.round((gstAmount / 2) * 100) / 100;
        sgstAmount = gstAmount - cgstAmount; // avoid rounding errors
      }

      totalTaxableAmount += taxableAmount;
      totalCGST += cgstAmount;
      totalSGST += sgstAmount;
      totalIGST += igstAmount;
      totalGST += gstAmount;

      saleItems.push({
        ...item,
        totalPrice,
        hsnCode: medicine.hsnCode || '',
        gstRate,
        taxableAmount,
        cgstAmount,
        sgstAmount,
        igstAmount
      });
    }
    
    const totalAmount = subtotal - (discount || 0);
    
    const sale = await Sale.create({
      billNumber,
      customerName: customerName || 'Walk-in Customer',
      customerPhone,
      customerGSTIN: customerGSTIN || '',
      items: saleItems,
      subtotal,
      discount: discount || 0,
      totalAmount,
      isInterState: isInterState || false,
      totalTaxableAmount: Math.round(totalTaxableAmount * 100) / 100,
      totalCGST: Math.round(totalCGST * 100) / 100,
      totalSGST: Math.round(totalSGST * 100) / 100,
      totalIGST: Math.round(totalIGST * 100) / 100,
      totalGST: Math.round(totalGST * 100) / 100,
      paymentMethod: paymentMethod || 'cash',
      soldBy: req.user._id
    });
    
    // Update medicine stock and check safety levels
    const { sendRealtimeNotification } = require('../utils/notificationUtils');
    for (const item of saleItems) {
      const updatedMed = await Medicine.findByIdAndUpdate(
        item.medicine,
        { $inc: { quantity: -item.quantity } },
        { new: true }
      );

      if (updatedMed && updatedMed.quantity <= updatedMed.reorderLevel) {
        sendRealtimeNotification({
          id: `lowstock-${updatedMed._id}-${Date.now()}`,
          type: 'lowstock',
          priority: updatedMed.quantity === 0 ? 'critical' : 'warning',
          title: 'Low Stock Alert',
          message: `${updatedMed.name} - Only ${updatedMed.quantity} units left`,
          details: `Reorder Level: ${updatedMed.reorderLevel} | Category: ${updatedMed.category}`,
          date: new Date(),
          icon: 'Package',
          medicineId: updatedMed._id
        });
      }
    }

    await logAudit({
      action: 'CREATE',
      entity: 'Sale',
      entityId: sale._id,
      entityName: sale.billNumber,
      user: req.user,
      details: `Sale ${sale.billNumber} — ₹${sale.totalAmount} (${saleItems.length} items, GST: ₹${sale.totalGST})`,
      ipAddress: req.ip
    });
    
    res.status(201).json({ success: true, sale });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteSale = async (req, res) => {
  try {
    const sale = await Sale.findById(req.params.id);
    if (!sale) {
      return res.status(404).json({ success: false, message: 'Sale not found' });
    }

    // Restore medicine stock
    for (const item of sale.items) {
      if (item.medicine) {
        await Medicine.findByIdAndUpdate(
          item.medicine,
          { $inc: { quantity: item.quantity } }
        );
      }
    }

    await Sale.findByIdAndDelete(req.params.id);

    await logAudit({
      action: 'DELETE',
      entity: 'Sale',
      entityId: sale._id,
      entityName: sale.billNumber,
      user: req.user,
      details: `Deleted sale ${sale.billNumber} (₹${sale.totalAmount}) and restored stock`,
      ipAddress: req.ip
    });

    res.json({ success: true, message: 'Sale deleted successfully and stock restored' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};