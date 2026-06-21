const express = require('express');
const router = express.Router();
const supplierController = require('../controllers/supplierController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);

router.get('/', supplierController.getSuppliers);
router.get('/:id', supplierController.getSupplier);
router.post('/', authorize('admin', 'pharmacist'), supplierController.createSupplier);
router.put('/:id', authorize('admin', 'pharmacist'), supplierController.updateSupplier);
router.delete('/:id', authorize('admin'), supplierController.deleteSupplier);

module.exports = router;