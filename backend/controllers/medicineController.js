const Medicine = require('../models/Medicine');

// Search/Autocomplete medicines
exports.searchMedicines = async (req, res) => {
  try {
    const { q, limit = 10 } = req.query;
    
    if (!q || q.length < 1) {
      return res.json({ success: true, medicines: [] });
    }
    
    const medicines = await Medicine.find({
      $and: [
        { isActive: true },
        {
          $or: [
            { name: { $regex: q, $options: 'i' } },
            { genericName: { $regex: q, $options: 'i' } },
            { manufacturer: { $regex: q, $options: 'i' } }
          ]
        }
      ]
    })
    .select('name genericName manufacturer category sellingPrice quantity dosage requiresPrescription')
    .limit(Number(limit))
    .sort({ name: 1 });
    
    res.json({ success: true, medicines });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get all medicines with filters
exports.getMedicines = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, category, stockStatus } = req.query;
    
    let query = { isActive: true };
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { genericName: { $regex: search, $options: 'i' } },
        { batchNumber: { $regex: search, $options: 'i' } },
        { manufacturer: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (category) query.category = category;
    
    if (stockStatus === 'low') {
      query.$expr = { $lte: ['$quantity', '$reorderLevel'] };
    }
    
    const medicines = await Medicine.find(query)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });
    
    const total = await Medicine.countDocuments(query);
    
    res.json({
      success: true,
      medicines,
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

// Get single medicine
exports.getMedicine = async (req, res) => {
  try {
    const medicine = await Medicine.findById(req.params.id);
    if (!medicine) {
      return res.status(404).json({ success: false, message: 'Medicine not found' });
    }
    res.json({ success: true, medicine });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Create medicine
exports.createMedicine = async (req, res) => {
  try {
    req.body.createdBy = req.user._id;
    const medicine = await Medicine.create(req.body);
    res.status(201).json({ success: true, medicine });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update medicine
exports.updateMedicine = async (req, res) => {
  try {
    const medicine = await Medicine.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!medicine) {
      return res.status(404).json({ success: false, message: 'Medicine not found' });
    }
    res.json({ success: true, medicine });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete medicine (soft delete)
exports.deleteMedicine = async (req, res) => {
  try {
    const medicine = await Medicine.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    if (!medicine) {
      return res.status(404).json({ success: false, message: 'Medicine not found' });
    }
    res.json({ success: true, message: 'Medicine deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get expiring medicines
exports.getExpiringMedicines = async (req, res) => {
  try {
    const thirtyDays = new Date();
    thirtyDays.setDate(thirtyDays.getDate() + 30);
    
    const medicines = await Medicine.find({
      expiryDate: { $lte: thirtyDays },
      isActive: true
    }).sort({ expiryDate: 1 });
    
    res.json({ success: true, medicines });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get low stock medicines
exports.getLowStockMedicines = async (req, res) => {
  try {
    const medicines = await Medicine.find({
      $expr: { $lte: ['$quantity', '$reorderLevel'] },
      isActive: true
    });
    
    res.json({ success: true, medicines });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Apply discount to expiring medicines
exports.applyExpiryDiscount = async (req, res) => {
  try {
    const { percentage = 20, days = 30 } = req.body;
    
    const expiryThreshold = new Date();
    expiryThreshold.setDate(expiryThreshold.getDate() + Number(days));
    
    // Find active, un-discounted medicines expiring within the window (and not already expired)
    const medicines = await Medicine.find({
      isActive: true,
      discountApplied: { $ne: true },
      expiryDate: { $gt: new Date(), $lte: expiryThreshold }
    });
    
    let updatedCount = 0;
    for (const med of medicines) {
      med.originalPrice = med.sellingPrice;
      med.sellingPrice = Math.round((med.sellingPrice * (1 - percentage / 100)) * 100) / 100;
      med.discountApplied = true;
      await med.save();
      updatedCount++;
    }
    
    res.json({
      success: true,
      message: `Successfully applied a ${percentage}% discount to ${updatedCount} medicines expiring within ${days} days.`,
      updatedCount
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Revert discount
exports.revertExpiryDiscount = async (req, res) => {
  try {
    const medicines = await Medicine.find({
      isActive: true,
      discountApplied: true
    });
    
    let revertedCount = 0;
    for (const med of medicines) {
      if (med.originalPrice !== undefined) {
        med.sellingPrice = med.originalPrice;
        med.originalPrice = undefined;
        med.discountApplied = false;
        await med.save();
        revertedCount++;
      }
    }
    
    res.json({
      success: true,
      message: `Successfully reverted discounts for ${revertedCount} medicines.`,
      revertedCount
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};