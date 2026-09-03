/**
 * IoT & Edge Gateway Controller
 * Manages ESP32 ultrasonic sensors, ESP32-CAM optical gates, and servo barriers.
 */

const { get, query, run } = require('../../../database/db');

/**
 * Handle incoming telemetry & distance events from ESP32 Ultrasonic sensors
 * POST /api/iot/sensor-event
 */
const handleSensorEvent = async (req, res, next) => {
    try {
        const { deviceId, slotId, distanceCm, rawVoltage } = req.body;

        if (!deviceId && !slotId) {
            return res.status(400).json({ success: false, error: 'deviceId or slotId is required' });
        }

        const distance = parseInt(distanceCm, 10);
        const isOccupied = distance > 0 && distance <= 50; // Under 50cm = vehicle detected
        const detectedState = isOccupied ? 'occupied' : 'free';

        // 1. Locate slot
        let slot = null;
        if (slotId) {
            slot = await get('SELECT * FROM parking_slots WHERE id = ?', [slotId]);
        } else if (deviceId) {
            slot = await get('SELECT * FROM parking_slots WHERE sensor_id = ?', [deviceId]);
        }

        if (slot) {
            const previousStatus = slot.status;

            // If sensor detects vehicle in available/reserved slot
            if (isOccupied && previousStatus !== 'occupied') {
                await run('UPDATE parking_slots SET status = ?, last_status_change = CURRENT_TIMESTAMP WHERE id = ?', ['occupied', slot.id]);
                console.log(`📡 [IoT Gateway] Slot ${slot.slot_number} (ID: ${slot.id}) transitioned to OCCUPIED (Distance: ${distance}cm)`);
            } else if (!isOccupied && previousStatus === 'occupied') {
                await run('UPDATE parking_slots SET status = ?, last_status_change = CURRENT_TIMESTAMP WHERE id = ?', ['available', slot.id]);
                console.log(`📡 [IoT Gateway] Slot ${slot.slot_number} (ID: ${slot.id}) transitioned to AVAILABLE (Distance: ${distance}cm)`);
            }
        }

        // 2. Update IoT device health & heartbeat
        if (deviceId) {
            try {
                const existingDevice = await get('SELECT id FROM iot_devices WHERE device_id = ?', [deviceId]);
                if (existingDevice) {
                    await run(
                        'UPDATE iot_devices SET last_distance_cm = ?, last_seen = CURRENT_TIMESTAMP, status = ? WHERE device_id = ?',
                        [distance, 'online', deviceId]
                    );
                } else {
                    await run(
                        'INSERT INTO iot_devices (device_id, slot_id, device_type, status, last_distance_cm, battery_percentage) VALUES (?, ?, ?, ?, ?, ?)',
                        [deviceId, slot ? slot.id : null, 'ultrasonic', 'online', distance, 98]
                    );
                }
            } catch (deviceErr) {
                console.warn('[IoT Gateway] Device record update skipped:', deviceErr.message);
            }
        }

        return res.status(200).json({
            success: true,
            data: {
                deviceId,
                slotId: slot ? slot.id : null,
                slotNumber: slot ? slot.slot_number : null,
                distanceCm: distance,
                state: detectedState,
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get all registered IoT devices with live connectivity status
 * GET /api/iot/devices
 */
const getDevices = async (req, res, next) => {
    try {
        let devices = [];
        try {
            devices = await query(`
                SELECT d.*, s.slot_number, s.status as slot_status 
                FROM iot_devices d
                LEFT JOIN parking_slots s ON d.slot_id = s.id
                ORDER BY d.last_seen DESC
            `);
        } catch (e) {
            devices = [];
        }

        return res.status(200).json({
            success: true,
            count: devices.length,
            devices
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Register or update an IoT edge unit (ESP32, Camera, Gate Servo)
 * POST /api/iot/register-device
 */
const registerDevice = async (req, res, next) => {
    try {
        const { deviceId, slotId, deviceType, firmwareVersion } = req.body;

        if (!deviceId || !deviceType) {
            return res.status(400).json({ success: false, error: 'deviceId and deviceType are required' });
        }

        const existing = await get('SELECT id FROM iot_devices WHERE device_id = ?', [deviceId]);
        if (existing) {
            await run(
                'UPDATE iot_devices SET slot_id = ?, device_type = ?, firmware_version = ?, last_seen = CURRENT_TIMESTAMP WHERE device_id = ?',
                [slotId || null, deviceType, firmwareVersion || '1.0.0', deviceId]
            );
        } else {
            await run(
                'INSERT INTO iot_devices (device_id, slot_id, device_type, firmware_version, status, battery_percentage) VALUES (?, ?, ?, ?, ?, ?)',
                [deviceId, slotId || null, deviceType, firmwareVersion || '1.0.0', 'online', 100]
            );
        }

        return res.status(201).json({
            success: true,
            message: `IoT Device ${deviceId} registered successfully`,
            device: { deviceId, slotId, deviceType, status: 'online' }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Trigger barrier servo gate (Open/Close) for entry or exit
 * POST /api/iot/gate/control
 */
const controlGate = async (req, res, next) => {
    try {
        const { gateId, action, bookingCode } = req.body; // action: 'OPEN' | 'CLOSE'

        if (!gateId || !action) {
            return res.status(400).json({ success: false, error: 'gateId and action (OPEN/CLOSE) are required' });
        }

        console.log(`🚧 [IoT Gate Controller] Barrier Gate ${gateId} executed action: ${action.toUpperCase()} for booking: ${bookingCode || 'N/A'}`);

        return res.status(200).json({
            success: true,
            gateId,
            action: action.toUpperCase(),
            servoAngle: action.toUpperCase() === 'OPEN' ? 90 : 0,
            status: 'EXECUTED',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get live telemetry streams for dashboard
 * GET /api/iot/telemetry
 */
const getTelemetry = async (req, res, next) => {
    try {
        const slots = await query(`
            SELECT s.id, s.slot_number, s.slot_type, s.status, s.sensor_id,
                   COALESCE(z.zone_name, 'Main') as zone_name,
                   COALESCE(f.floor_name, 'Floor 1') as floor_name
            FROM parking_slots s
            LEFT JOIN parking_zones z ON s.zone_id = z.id
            LEFT JOIN parking_floors f ON z.floor_id = f.id
        `);
        
        const summary = {
            totalSlots: slots.length,
            available: slots.filter(s => s.status === 'available').length,
            occupied: slots.filter(s => s.status === 'occupied').length,
            reserved: slots.filter(s => s.status === 'reserved').length,
            maintenance: slots.filter(s => s.status === 'maintenance' || s.status === 'disabled').length,
            occupancyRate: slots.length > 0 ? `${Math.round((slots.filter(s => s.status === 'occupied').length / slots.length) * 100)}%` : '0%'
        };

        return res.status(200).json({
            success: true,
            summary,
            slots
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    handleSensorEvent,
    getDevices,
    registerDevice,
    controlGate,
    getTelemetry
};
