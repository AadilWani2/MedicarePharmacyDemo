const Supplier = require('../models/Supplier');

exports.getSuppliers = async (req, res) => {
  try {
    const { page = 1, limit = 100, search } = req.query;
    
    let query = {};
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { contactPerson: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }
    
    const suppliers = await Supplier.find(query)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });
    
    const total = await Supplier.countDocuments(query);
    
    console.log(`📦 Found ${total} suppliers`);
    
    res.json({
      success: true,
      suppliers,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error('Get suppliers error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getSupplier = async (req, res) => {
  try {
    const supplier = await Supplier.findById(req.params.id);
    if (!supplier) {
      return res.status(404).json({ success: false, message: 'Supplier not found' });
    }
    res.json({ success: true, supplier });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createSupplier = async (req, res) => {
  try {
    req.body.createdBy = req.user._id;
    const supplier = await Supplier.create(req.body);
    console.log('✅ Supplier created:', supplier.name);
    res.status(201).json({ success: true, supplier });
  } catch (error) {
    console.error('Create supplier error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateSupplier = async (req, res) => {
  try {
    const supplier = await Supplier.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!supplier) {
      return res.status(404).json({ success: false, message: 'Supplier not found' });
    }
    console.log('✅ Supplier updated:', supplier.name);
    res.json({ success: true, supplier });
  } catch (error) {
    console.error('Update supplier error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// HARD DELETE
exports.deleteSupplier = async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🗑️ Attempting to delete supplier: ${id}`);
    
    // First check if supplier exists
    const supplier = await Supplier.findById(id);
    
    if (!supplier) {
      console.log(`❌ Supplier not found: ${id}`);
      return res.status(404).json({ 
        success: false, 
        message: 'Supplier not found' 
      });
    }
    
    // Delete it
    await Supplier.findByIdAndDelete(id);
    
    // Verify it's deleted
    const checkDeleted = await Supplier.findById(id);
    console.log(`✅ Deleted. Verification: ${checkDeleted ? 'STILL EXISTS!' : 'Successfully deleted'}`);
    
    res.json({ 
      success: true, 
      message: `Supplier "${supplier.name}" permanently deleted`,
      deletedId: id
    });
  } catch (error) {
    console.error('❌ Delete error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};