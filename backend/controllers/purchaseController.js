const Purchase = require('../models/Purchase');
const Medicine = require('../models/Medicine');

exports.getPurchases = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    
    const purchases = await Purchase.find()
      .populate('supplier', 'name contactPerson')
      .populate('createdBy', 'name')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ purchaseDate: -1 });
    
    const total = await Purchase.countDocuments();
    
    res.json({
      success: true,
      purchases,
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

exports.getPurchase = async (req, res) => {
  try {
    const purchase = await Purchase.findById(req.params.id)
      .populate('supplier')
      .populate('items.medicine')
      .populate('createdBy', 'name');
    
    if (!purchase) {
      return res.status(404).json({ success: false, message: 'Purchase not found' });
    }
    res.json({ success: true, purchase });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createPurchase = async (req, res) => {
  try {
    const { supplier, items, discount, paymentMethod, notes } = req.body;
    
    // Generate invoice number
    const invoiceNumber = await Purchase.generateInvoiceNumber();
    
    // Calculate totals
    let totalAmount = 0;
    const purchaseItems = items.map(item => {
      const totalPrice = item.quantity * item.purchasePrice;
      totalAmount += totalPrice;
      return {
        ...item,
        totalPrice
      };
    });
    
    const netAmount = totalAmount - (discount || 0);
    
    const purchase = await Purchase.create({
      invoiceNumber,
      supplier,
      items: purchaseItems,
      totalAmount,
      discount: discount || 0,
      netAmount,
      paymentMethod: paymentMethod || 'bank_transfer',
      notes,
      createdBy: req.user._id
    });
    
    // Update medicine stock
    for (const item of purchaseItems) {
      await Medicine.findByIdAndUpdate(
        item.medicine,
        { $inc: { quantity: item.quantity } }
      );
    }
    
    res.status(201).json({ success: true, purchase });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};