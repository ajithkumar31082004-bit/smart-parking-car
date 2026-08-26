const express = require('express');
const router = express.Router();
const locationController = require('../controllers/locationController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/', locationController.getLocations);
router.get('/:id', locationController.getLocationById);
router.get('/:id/slots', locationController.getLocationSlots);
router.put('/slots/:slotId/status', authenticate, authorize('staff', 'manager', 'admin', 'superadmin'), locationController.updateSlotStatus);

module.exports = router;
