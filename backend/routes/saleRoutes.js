const express = require('express');
const router = express.Router();
const saleController = require('../controllers/saleController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);

router.get('/', saleController.getSales);
router.get('/:id', saleController.getSale);
router.post('/', saleController.createSale);
router.delete('/:id', authorize('admin'), saleController.deleteSale);

module.exports = router;