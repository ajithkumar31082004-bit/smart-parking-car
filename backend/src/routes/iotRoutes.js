const express = require('express');
const router = express.Router();
const iotController = require('../controllers/iotController');

// ESP32 Ultrasonic sensor distance event
router.post('/sensor-event', iotController.handleSensorEvent);

// List all IoT devices and hardware health
router.get('/devices', iotController.getDevices);

// Register new IoT unit (ESP32/Camera/Gate)
router.post('/register-device', iotController.registerDevice);

// Control automated barrier servo gate
router.post('/gate/control', iotController.controlGate);

// Live real-time occupancy telemetry stream
router.get('/telemetry', iotController.getTelemetry);

module.exports = router;
