const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticate, authorize } = require('../middleware/auth');

// Analytics — accessible to manager, admin, and superadmin
router.get('/analytics/kpis',    authenticate, authorize('manager', 'admin', 'superadmin'), adminController.getAnalyticsKPIs);
router.get('/analytics/charts',  authenticate, authorize('manager', 'admin', 'superadmin'), adminController.getAnalyticsCharts);

// Sensitive operations — admin and superadmin only
router.get('/fraud-events',              authenticate, authorize('admin', 'superadmin'), adminController.getFraudEvents);
router.get('/audit-logs',               authenticate, authorize('admin', 'superadmin'), adminController.getAuditLogs);
router.put('/pricing-rules/:ruleId',    authenticate, authorize('admin', 'superadmin'), adminController.updatePricingRule);

module.exports = router;
