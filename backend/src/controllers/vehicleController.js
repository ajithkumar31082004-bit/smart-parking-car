const { query, run, get } = require('../../../database/db');

// Get user vehicles
exports.getMyVehicles = async (req, res, next) => {
    try {
        const vehicles = await query('SELECT * FROM vehicles WHERE user_id = ? ORDER BY is_default DESC, id DESC', [req.user.id]);
        res.json({ success: true, count: vehicles.length, vehicles });
    } catch (err) {
        next(err);
    }
};

// Add new vehicle
exports.addVehicle = async (req, res, next) => {
    try {
        const { vehicleNumber, vehicleType = 'car', brand, model, color, fuelType = 'petrol', isEv = false } = req.body;
        const userId = req.user.id;

        if (!vehicleNumber) {
            return res.status(400).json({ success: false, error: 'Vehicle number is required.' });
        }

        const vNum = vehicleNumber.toUpperCase().trim();
        const existing = await get('SELECT id FROM vehicles WHERE vehicle_number = ?', [vNum]);
        if (existing) {
            return res.status(400).json({ success: false, error: 'A vehicle with this license plate is already registered.' });
        }

        const count = await get('SELECT COUNT(*) as c FROM vehicles WHERE user_id = ?', [userId]);
        const isDefault = count.c === 0 ? 1 : 0;

        const resV = await run(`
            INSERT INTO vehicles (user_id, vehicle_number, vehicle_type, brand, model, color, fuel_type, is_ev, is_default)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [userId, vNum, vehicleType, brand || null, model || null, color || null, fuelType, isEv ? 1 : 0, isDefault]);

        res.status(201).json({
            success: true,
            message: 'Vehicle added successfully',
            vehicle: {
                id: resV.lastID,
                vehicleNumber: vNum,
                vehicleType,
                brand,
                model,
                isEv: Boolean(isEv),
                isDefault: Boolean(isDefault)
            }
        });
    } catch (err) {
        next(err);
    }
};

// Delete vehicle
exports.deleteVehicle = async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        await run('DELETE FROM vehicles WHERE id = ? AND user_id = ?', [id, userId]);
        res.json({ success: true, message: 'Vehicle deleted successfully.' });
    } catch (err) {
        next(err);
    }
};

// Set default vehicle
exports.setDefaultVehicle = async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        await run('UPDATE vehicles SET is_default = 0 WHERE user_id = ?', [userId]);
        await run('UPDATE vehicles SET is_default = 1 WHERE id = ? AND user_id = ?', [id, userId]);

        res.json({ success: true, message: 'Default vehicle updated.' });
    } catch (err) {
        next(err);
    }
};
