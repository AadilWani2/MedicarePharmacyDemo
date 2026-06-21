const express = require('express');
const router = express.Router();
const purchaseController = require('../controllers/purchaseController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);

router.get('/', purchaseController.getPurchases);
router.get('/:id', purchaseController.getPurchase);
router.post('/', authorize('admin', 'pharmacist'), purchaseController.createPurchase);

module.exports = router;