const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);

router.get('/inventory', authorize('admin', 'pharmacist'), reportController.getInventoryReport);
router.get('/sales', authorize('admin', 'pharmacist'), reportController.getSalesReport);
router.get('/expiry', authorize('admin', 'pharmacist'), reportController.getExpiryReport);
router.get('/low-stock', authorize('admin', 'pharmacist'), reportController.getLowStockReport);
router.post('/send-email-alerts', authorize('admin'), reportController.triggerEmailAlerts);
router.get('/supplier-return-memos', authorize('admin'), reportController.getSupplierReturnMemos);
router.get('/notifications/stream', reportController.streamNotifications);

module.exports = router;