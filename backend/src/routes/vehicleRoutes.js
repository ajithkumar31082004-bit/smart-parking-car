const express = require('express');
const router = express.Router();
const vehicleController = require('../controllers/vehicleController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.get('/', vehicleController.getMyVehicles);
router.post('/', vehicleController.addVehicle);
router.delete('/:id', vehicleController.deleteVehicle);
router.put('/:id/default', vehicleController.setDefaultVehicle);

module.exports = router;
