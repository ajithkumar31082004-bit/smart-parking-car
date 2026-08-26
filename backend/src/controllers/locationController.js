const { query, get, run } = require('../../../database/db');

// Get all active parking locations with live slot occupancy
exports.getLocations = async (req, res, next) => {
    try {
        const locations = await query(`
            SELECT 
                pl.*,
                (SELECT COUNT(*) FROM parking_slots ps 
                 JOIN parking_zones pz ON ps.zone_id = pz.id 
                 JOIN parking_floors pf ON pz.floor_id = pf.id 
                 WHERE pf.location_id = pl.id) as live_total_slots,
                (SELECT COUNT(*) FROM parking_slots ps 
                 JOIN parking_zones pz ON ps.zone_id = pz.id 
                 JOIN parking_floors pf ON pz.floor_id = pf.id 
                 WHERE pf.location_id = pl.id AND ps.status = 'available') as live_available_slots,
                (SELECT COUNT(*) FROM parking_slots ps 
                 JOIN parking_zones pz ON ps.zone_id = pz.id 
                 JOIN parking_floors pf ON pz.floor_id = pf.id 
                 WHERE pf.location_id = pl.id AND ps.slot_type = 'ev' AND ps.status = 'available') as live_ev_available_slots
            FROM parking_locations pl
            WHERE pl.is_active = 1
            ORDER BY pl.rating DESC
        `);

        res.json({
            success: true,
            count: locations.length,
            locations
        });
    } catch (err) {
        next(err);
    }
};

// Get single location by ID
exports.getLocationById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const location = await get(`SELECT * FROM parking_locations WHERE id = ?`, [id]);

        if (!location) {
            return res.status(404).json({ success: false, error: 'Parking location not found.' });
        }

        const reviews = await query(`
            SELECT r.*, u.name as user_name 
            FROM reviews r 
            JOIN users u ON r.user_id = u.id 
            WHERE r.location_id = ? 
            ORDER BY r.created_at DESC LIMIT 10
        `, [id]);

        res.json({
            success: true,
            location: {
                ...location,
                reviews
            }
        });
    } catch (err) {
        next(err);
    }
};

// Get hierarchical floors, zones, and slots for a location
exports.getLocationSlots = async (req, res, next) => {
    try {
        const { id } = req.params;

        const location = await get('SELECT id, name, base_hourly_rate FROM parking_locations WHERE id = ?', [id]);
        if (!location) {
            return res.status(404).json({ success: false, error: 'Location not found.' });
        }

        const floors = await query('SELECT * FROM parking_floors WHERE location_id = ? ORDER BY floor_number ASC', [id]);

        for (const floor of floors) {
            floor.zones = await query('SELECT * FROM parking_zones WHERE floor_id = ? ORDER BY zone_name ASC', [floor.id]);
            for (const zone of floor.zones) {
                zone.slots = await query(`
                    SELECT 
                        ps.*,
                        ec.charger_code,
                        ec.charger_type,
                        ec.power_kw,
                        ec.rate_per_kwh,
                        ec.status as charger_status
                    FROM parking_slots ps
                    LEFT JOIN ev_chargers ec ON ps.id = ec.slot_id
                    WHERE ps.zone_id = ?
                    ORDER BY ps.slot_number ASC
                `, [zone.id]);
            }
        }

        res.json({
            success: true,
            location,
            floors
        });
    } catch (err) {
        next(err);
    }
};

// Update slot status (Manager/Admin action or IoT simulator)
exports.updateSlotStatus = async (req, res, next) => {
    try {
        const { slotId } = req.params;
        const { status } = req.body;

        const validStatuses = ['available', 'occupied', 'reserved', 'maintenance', 'disabled'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ success: false, error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
        }

        const now = new Date().toISOString();
        await run(`UPDATE parking_slots SET status = ?, last_status_change = ? WHERE id = ?`, [status, now, slotId]);

        // If EV slot, sync charger status
        if (status === 'occupied') {
            await run(`UPDATE ev_chargers SET status = 'charging' WHERE slot_id = ?`, [slotId]);
        } else if (status === 'available') {
            await run(`UPDATE ev_chargers SET status = 'available' WHERE slot_id = ?`, [slotId]);
        }

        res.json({
            success: true,
            message: `Slot #${slotId} status updated to '${status}'.`,
            status
        });
    } catch (err) {
        next(err);
    }
};
