const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticate, authorize } = require('../middleware/auth');

// All admin routes require admin, manager, or superadmin
router.use(authenticate, authorize('manager', 'admin', 'superadmin'));

router.get('/analytics/kpis', adminController.getAnalyticsKPIs);
router.get('/analytics/charts', adminController.getAnalyticsCharts);
router.get('/fraud-events', adminController.getFraudEvents);
router.get('/audit-logs', adminController.getAuditLogs);
router.put('/pricing-rules/:ruleId', adminController.updatePricingRule);

module.exports = router;
