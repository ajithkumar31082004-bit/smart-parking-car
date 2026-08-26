const express = require('express');
const router = express.Router();
const qrController = require('../controllers/qrController');
const { authenticate, authorize } = require('../middleware/auth');

router.post('/verify', authenticate, qrController.verifyQR);
router.post('/check-in', authenticate, authorize('staff', 'manager', 'admin', 'superadmin'), qrController.staffCheckIn);
router.post('/check-out', authenticate, authorize('staff', 'manager', 'admin', 'superadmin'), qrController.staffCheckOut);

module.exports = router;
