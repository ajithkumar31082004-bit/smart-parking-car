const { get, query, run } = require('../../../database/db');

// Executive Dashboard Summary & KPIs
exports.getAnalyticsKPIs = async (req, res, next) => {
    try {
        // Slot counts across all locations
        const slotStats = await get(`
            SELECT 
                COUNT(*) as total_slots,
                SUM(CASE WHEN status = 'available' THEN 1 ELSE 0 END) as available_slots,
                SUM(CASE WHEN status = 'occupied' THEN 1 ELSE 0 END) as occupied_slots,
                SUM(CASE WHEN status = 'reserved' THEN 1 ELSE 0 END) as reserved_slots,
                SUM(CASE WHEN status = 'maintenance' THEN 1 ELSE 0 END) as maintenance_slots,
                SUM(CASE WHEN slot_type = 'ev' THEN 1 ELSE 0 END) as total_ev_slots
            FROM parking_slots
        `);

        // Revenue metrics
        const revenueStats = await get(`
            SELECT 
                COALESCE(SUM(amount), 0) as total_all_time_revenue,
                COALESCE(SUM(CASE WHEN date(paid_at) = date('now') THEN amount ELSE 0 END), 0) as today_revenue,
                COALESCE(SUM(CASE WHEN strftime('%Y-%m', paid_at) = strftime('%Y-%m', 'now') THEN amount ELSE 0 END), 0) as month_revenue,
                COUNT(*) as total_payments
            FROM payments
            WHERE status = 'completed'
        `);

        // Booking statistics
        const bookingStats = await get(`
            SELECT 
                COUNT(*) as total_bookings,
                SUM(CASE WHEN date(created_at) = date('now') THEN 1 ELSE 0 END) as today_bookings,
                SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_bookings,
                SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_bookings,
                SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_bookings,
                AVG(duration_hours) as avg_duration_hours
            FROM bookings
        `);

        // Active user counts
        const userStats = await get(`
            SELECT 
                COUNT(*) as total_users,
                SUM(CASE WHEN role = 'customer' THEN 1 ELSE 0 END) as total_customers,
                SUM(CASE WHEN role IN ('staff', 'manager', 'admin') THEN 1 ELSE 0 END) as total_staff
            FROM users
        `);

        // EV Charger statistics
        const evStats = await get(`
            SELECT 
                COUNT(*) as total_chargers,
                SUM(CASE WHEN status = 'charging' THEN 1 ELSE 0 END) as active_charging_sessions,
                SUM(CASE WHEN status = 'available' THEN 1 ELSE 0 END) as available_chargers,
                COALESCE(SUM(total_energy_delivered_kwh), 0) as total_energy_delivered_kwh
            FROM ev_chargers
        `);

        // Overall occupancy calculation
        const total = slotStats.total_slots || 1;
        const occupied = (slotStats.occupied_slots || 0) + (slotStats.reserved_slots || 0);
        const overallOccupancyPct = Math.round((occupied / total) * 100);

        // Location breakdown
        const locations = await query(`
            SELECT 
                pl.id, pl.name, pl.city, pl.base_hourly_rate, pl.rating,
                COUNT(ps.id) as total_slots,
                SUM(CASE WHEN ps.status = 'occupied' THEN 1 ELSE 0 END) as occupied_slots,
                SUM(CASE WHEN ps.status = 'available' THEN 1 ELSE 0 END) as available_slots
            FROM parking_locations pl
            LEFT JOIN parking_floors pf ON pf.location_id = pl.id
            LEFT JOIN parking_zones pz ON pz.floor_id = pf.id
            LEFT JOIN parking_slots ps ON ps.zone_id = pz.id
            GROUP BY pl.id
        `);

        res.json({
            success: true,
            kpis: {
                slots: {
                    total: slotStats.total_slots,
                    available: slotStats.available_slots,
                    occupied: slotStats.occupied_slots,
                    reserved: slotStats.reserved_slots,
                    maintenance: slotStats.maintenance_slots,
                    evSlots: slotStats.total_ev_slots,
                    overallOccupancyPct
                },
                revenue: {
                    today: revenueStats.today_revenue,
                    thisMonth: revenueStats.month_revenue,
                    allTime: revenueStats.total_all_time_revenue,
                    totalTransactions: revenueStats.total_payments
                },
                bookings: {
                    total: bookingStats.total_bookings,
                    today: bookingStats.today_bookings,
                    active: bookingStats.active_bookings,
                    completed: bookingStats.completed_bookings,
                    cancelled: bookingStats.cancelled_bookings,
                    avgDurationHours: parseFloat((bookingStats.avg_duration_hours || 0).toFixed(1))
                },
                users: userStats,
                ev: evStats,
                locations
            }
        });
    } catch (err) {
        next(err);
    }
};

// Historical Occupancy & Revenue Timeseries for charts
exports.getAnalyticsCharts = async (req, res, next) => {
    try {
        // 7-day revenue trend
        const revenueTrend = await query(`
            SELECT 
                date(paid_at) as date,
                SUM(amount) as revenue,
                COUNT(*) as transactions
            FROM payments
            WHERE paid_at >= date('now', '-7 days') AND status = 'completed'
            GROUP BY date(paid_at)
            ORDER BY date(paid_at) ASC
        `);

        // Hourly occupancy curve (averaged across past 7 days)
        const hourlyOccupancy = await query(`
            SELECT 
                hour_of_day,
                AVG(occupancy_pct) as avg_occupancy
            FROM occupancy_records
            GROUP BY hour_of_day
            ORDER BY hour_of_day ASC
        `);

        // Vehicle types breakdown
        const vehicleTypes = await query(`
            SELECT 
                vehicle_type,
                COUNT(*) as count
            FROM vehicles
            GROUP BY vehicle_type
        `);

        // Payment methods breakdown
        const paymentMethods = await query(`
            SELECT 
                payment_method,
                SUM(amount) as total_amount,
                COUNT(*) as count
            FROM payments
            GROUP BY payment_method
        `);

        res.json({
            success: true,
            charts: {
                revenueTrend,
                hourlyOccupancy,
                vehicleTypes,
                paymentMethods
            }
        });
    } catch (err) {
        next(err);
    }
};

// Get Fraud and Anomaly Events
exports.getFraudEvents = async (req, res, next) => {
    try {
        const events = await query(`
            SELECT fe.*, u.name as user_name, u.email as user_email
            FROM fraud_events fe
            LEFT JOIN users u ON fe.user_id = u.id
            ORDER BY fe.detected_at DESC LIMIT 50
        `);

        res.json({
            success: true,
            count: events.length,
            events
        });
    } catch (err) {
        next(err);
    }
};

// Get Audit Logs
exports.getAuditLogs = async (req, res, next) => {
    try {
        const logs = await query(`
            SELECT al.*, u.name as user_name, u.email as user_email, u.role as user_role
            FROM audit_logs al
            LEFT JOIN users u ON al.user_id = u.id
            ORDER BY al.created_at DESC LIMIT 100
        `);

        res.json({
            success: true,
            count: logs.length,
            logs
        });
    } catch (err) {
        next(err);
    }
};

// Manage / Add / Edit Pricing Rules
exports.updatePricingRule = async (req, res, next) => {
    try {
        const { ruleId } = req.params;
        const { multiplier, minOccupancy, maxOccupancy } = req.body;

        await run(`
            UPDATE pricing_rules 
            SET multiplier = ?, min_occupancy_pct = ?, max_occupancy_pct = ?
            WHERE id = ?
        `, [multiplier, minOccupancy, maxOccupancy, ruleId]);

        await run(`
            INSERT INTO audit_logs (user_id, action, target_entity, entity_id, details)
            VALUES (?, 'UPDATE_PRICING_RULE', 'pricing_rules', ?, ?)
        `, [req.user.id, ruleId, `Pricing multiplier updated to ${multiplier}x`]);

        res.json({
            success: true,
            message: 'Pricing rule updated successfully.'
        });
    } catch (err) {
        next(err);
    }
};
