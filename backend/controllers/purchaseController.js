const Purchase = require('../models/Purchase');
const Medicine = require('../models/Medicine');
const { logAudit } = require('../middleware/auditMiddleware');

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
    
    // Calculate totals with GST
    let totalAmount = 0;
    const purchaseItems = [];

    for (const item of items) {
      const totalPrice = item.quantity * item.purchasePrice;
      totalAmount += totalPrice;

      // Look up medicine GST info
      const medicine = await Medicine.findById(item.medicine);
      const gstRate = medicine?.gstRate || 0;
      const taxableAmount = Math.round((totalPrice / (1 + gstRate / 100)) * 100) / 100;
      const gstAmount = Math.round((totalPrice - taxableAmount) * 100) / 100;
      const cgstAmount = Math.round((gstAmount / 2) * 100) / 100;
      const sgstAmount = gstAmount - cgstAmount;

      purchaseItems.push({
        ...item,
        totalPrice,
        hsnCode: medicine?.hsnCode || '',
        gstRate,
        cgstAmount,
        sgstAmount,
        igstAmount: 0
      });
    }
    
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

    await logAudit({
      action: 'CREATE',
      entity: 'Purchase',
      entityId: purchase._id,
      entityName: purchase.invoiceNumber,
      user: req.user,
      details: `Purchase ${purchase.invoiceNumber} — ₹${purchase.netAmount} (${purchaseItems.length} items)`,
      ipAddress: req.ip
    });
    
    res.status(201).json({ success: true, purchase });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};