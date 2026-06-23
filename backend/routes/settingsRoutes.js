const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);

router.get('/', settingsController.getSettings);
router.put('/', authorize('admin'), settingsController.updateSettings);
router.get('/whatsapp/status', authorize('admin'), settingsController.getWhatsAppStatusSSE);
router.get('/whatsapp/status-check', authorize('admin'), settingsController.getWhatsAppStatusJSON);
router.post('/whatsapp/disconnect', authorize('admin'), settingsController.disconnectWhatsApp);
router.post('/whatsapp/connect', authorize('admin'), settingsController.connectWhatsApp);
router.post('/whatsapp/test', authorize('admin'), settingsController.sendTestWhatsApp);

module.exports = router;
