const express = require('express');
const router = express.Router();
const auditController = require('../controllers/auditController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);

router.get('/', authorize('admin'), auditController.getAuditLogs);
router.get('/stats', authorize('admin'), auditController.getAuditStats);

module.exports = router;
