const express = require('express');
const router = express.Router();
const medicineController = require('../controllers/medicineController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);

// Search/Autocomplete route (must be before /:id)
router.get('/search', medicineController.searchMedicines);

// Other routes
router.get('/expiring', medicineController.getExpiringMedicines);
router.get('/low-stock', medicineController.getLowStockMedicines);
router.post('/apply-discount', authorize('admin'), medicineController.applyExpiryDiscount);
router.post('/revert-discount', authorize('admin'), medicineController.revertExpiryDiscount);
router.get('/', medicineController.getMedicines);
router.get('/:id', medicineController.getMedicine);
router.post('/', authorize('admin', 'pharmacist'), medicineController.createMedicine);
router.put('/:id', authorize('admin', 'pharmacist'), medicineController.updateMedicine);
router.delete('/:id', authorize('admin'), medicineController.deleteMedicine);

module.exports = router;