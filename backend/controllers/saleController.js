const Sale = require('../models/Sale');
const Medicine = require('../models/Medicine');

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
    const { customerName, customerPhone, items, discount, paymentMethod } = req.body;
    
    // Generate bill number
    const billNumber = await Sale.generateBillNumber();
    
    // Calculate totals
    let subtotal = 0;
    const saleItems = items.map(item => {
      const totalPrice = item.quantity * item.unitPrice;
      subtotal += totalPrice;
      return {
        ...item,
        totalPrice
      };
    });
    
    const totalAmount = subtotal - (discount || 0);
    
    // Check stock availability
    for (const item of saleItems) {
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
    }
    
    const sale = await Sale.create({
      billNumber,
      customerName: customerName || 'Walk-in Customer',
      customerPhone,
      items: saleItems,
      subtotal,
      discount: discount || 0,
      totalAmount,
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

    res.json({ success: true, message: 'Sale deleted successfully and stock restored' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};