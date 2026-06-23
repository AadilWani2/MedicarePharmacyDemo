const Supplier = require('../models/Supplier');
const { logAudit, computeChanges } = require('../middleware/auditMiddleware');

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

    await logAudit({
      action: 'CREATE',
      entity: 'Supplier',
      entityId: supplier._id,
      entityName: supplier.name,
      user: req.user,
      details: `Created supplier: ${supplier.name} (${supplier.phone})`,
      ipAddress: req.ip
    });

    res.status(201).json({ success: true, supplier });
  } catch (error) {
    console.error('Create supplier error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateSupplier = async (req, res) => {
  try {
    const oldSupplier = await Supplier.findById(req.params.id);
    if (!oldSupplier) {
      return res.status(404).json({ success: false, message: 'Supplier not found' });
    }
    const oldData = oldSupplier.toObject();

    const supplier = await Supplier.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    const changes = computeChanges(oldData, supplier.toObject(), [
      'name', 'contactPerson', 'email', 'phone', 'alternatePhone',
      'gstNumber', 'drugLicenseNumber', 'paymentTerms', 'status', 'rating', 'notes'
    ]);

    if (changes) {
      await logAudit({
        action: 'UPDATE',
        entity: 'Supplier',
        entityId: supplier._id,
        entityName: supplier.name,
        user: req.user,
        changes,
        details: `Updated supplier: ${supplier.name}`,
        ipAddress: req.ip
      });
    }

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
    
    const supplier = await Supplier.findById(id);
    
    if (!supplier) {
      return res.status(404).json({ 
        success: false, 
        message: 'Supplier not found' 
      });
    }
    
    await Supplier.findByIdAndDelete(id);

    await logAudit({
      action: 'DELETE',
      entity: 'Supplier',
      entityId: supplier._id,
      entityName: supplier.name,
      user: req.user,
      details: `Permanently deleted supplier: ${supplier.name}`,
      ipAddress: req.ip
    });
    
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