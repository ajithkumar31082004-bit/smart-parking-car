const { get, query, run } = require('../../../database/db');

/**
 * Fraud & Risk Detection Engine
 * Multi-rule heuristic anomaly scoring evaluating rapid multi-bookings,
 * cancellation abuse, and suspicious profile patterns.
 */
async function assessBookingRisk({ userId, bookingAmount = 0, vehicleType = 'car', slotId = null }) {
    let riskScore = 10; // baseline low risk
    const flags = [];

    // Rule 1: Rapid Multi-Booking check (<30 mins)
    const recentBookings = await query(`
        SELECT id, created_at, status FROM bookings
        WHERE user_id = ? AND datetime(created_at) >= datetime('now', '-30 minutes')
    `, [userId]);

    if (recentBookings.length >= 3) {
        riskScore += 45;
        flags.push(`Rapid Multi-Booking: ${recentBookings.length} bookings created within past 30 minutes.`);
    } else if (recentBookings.length >= 2) {
        riskScore += 20;
        flags.push(`Multiple bookings detected (${recentBookings.length}) in short succession.`);
    }

    // Rule 2: Repeated Cancellation Velocity
    const cancellationStats = await get(`
        SELECT 
            COUNT(*) as total_user_bookings,
            SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_count
        FROM bookings
        WHERE user_id = ?
    `, [userId]);

    if (cancellationStats && cancellationStats.total_user_bookings >= 5) {
        const cancelRate = (cancellationStats.cancelled_count / cancellationStats.total_user_bookings);
        if (cancelRate > 0.60) {
            riskScore += 35;
            flags.push(`Abnormal cancellation rate: ${(cancelRate * 100).toFixed(0)}% of prior reservations cancelled.`);
        }
    }

    // Rule 3: Account Age & High-Value Anomaly
    const user = await get(`SELECT id, created_at FROM users WHERE id = ?`, [userId]);
    if (user) {
        const createdDate = new Date(user.created_at);
        const ageHours = (Date.now() - createdDate.getTime()) / (1000 * 60 * 60);
        if (ageHours < 2 && bookingAmount > 500) {
            riskScore += 25;
            flags.push('New account anomaly: High-value reservation initiated within 2 hours of registration.');
        }
    }

    // Rule 4: Cap risk score between 0 and 100
    riskScore = Math.min(100, Math.max(0, riskScore));

    let riskLevel = 'LOW';
    if (riskScore >= 75) riskLevel = 'CRITICAL';
    else if (riskScore >= 50) riskLevel = 'HIGH';
    else if (riskScore >= 30) riskLevel = 'MEDIUM';

    // If flagged as HIGH or CRITICAL, persist into fraud_events
    if (riskLevel === 'HIGH' || riskLevel === 'CRITICAL') {
        try {
            await run(`
                INSERT INTO fraud_events (user_id, risk_score, risk_level, reason, details)
                VALUES (?, ?, ?, ?, ?)
            `, [userId, riskScore, riskLevel, flags.join(' | '), JSON.stringify({ bookingAmount, vehicleType, slotId })]);
        } catch (e) {
            console.error('[FraudService] Failed to log fraud event:', e.message);
        }
    }

    return {
        userId,
        riskScore,
        riskLevel,
        isSuspicious: riskScore >= 50,
        flags: flags.length > 0 ? flags : ['Standard verified transaction behavior'],
        actionAllowed: riskScore < 85 // Blocks critical risk
    };
}

module.exports = {
    assessBookingRisk
};
