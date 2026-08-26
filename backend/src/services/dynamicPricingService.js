const { get, query } = require('../../../database/db');

/**
 * Dynamic Surge Pricing Engine
 * Calculates real-time rate adjustments based on location capacity, current occupancy,
 * time-of-day peak windows, and holiday/weekend surges.
 */
async function calculateDynamicPrice(locationId, requestedHours = 1) {
    // 1. Fetch location base pricing & occupancy stats
    const stats = await get(`
        SELECT 
            pl.id,
            pl.name,
            pl.base_hourly_rate,
            (SELECT COUNT(*) FROM parking_slots ps 
             JOIN parking_zones pz ON ps.zone_id = pz.id 
             JOIN parking_floors pf ON pz.floor_id = pf.id 
             WHERE pf.location_id = pl.id) as total_slots,
            (SELECT COUNT(*) FROM parking_slots ps 
             JOIN parking_zones pz ON ps.zone_id = pz.id 
             JOIN parking_floors pf ON pz.floor_id = pf.id 
             WHERE pf.location_id = pl.id AND ps.status = 'occupied') as occupied_slots
        FROM parking_locations pl
        WHERE pl.id = ?
    `, [locationId]);

    if (!stats) {
        throw new Error('Parking location not found');
    }

    const totalSlots = stats.total_slots || 1;
    const occupiedSlots = stats.occupied_slots || 0;
    const occupancyPct = Math.min(100, Math.round((occupiedSlots / totalSlots) * 100));

    // 2. Fetch custom pricing rules for this location
    const rules = await query(`
        SELECT * FROM pricing_rules 
        WHERE location_id = ? AND is_active = 1
        ORDER BY min_occupancy_pct ASC
    `, [locationId]);

    let occupancyMultiplier = 1.0;
    if (rules.length > 0) {
        for (const rule of rules) {
            if (occupancyPct >= rule.min_occupancy_pct && occupancyPct <= rule.max_occupancy_pct) {
                occupancyMultiplier = rule.multiplier;
                break;
            }
        }
    } else {
        // Default Tier rules
        if (occupancyPct >= 90) occupancyMultiplier = 1.80;
        else if (occupancyPct >= 75) occupancyMultiplier = 1.50;
        else if (occupancyPct >= 50) occupancyMultiplier = 1.25;
        else occupancyMultiplier = 1.00;
    }

    // 3. Peak Hour multiplier (5 PM - 9 PM)
    const currentHour = new Date().getHours();
    const isPeakHour = currentHour >= 17 && currentHour <= 21;
    const peakMultiplier = isPeakHour ? 1.15 : 1.0;

    // 4. Combined Multiplier (rounded to 2 decimal places)
    const finalMultiplier = parseFloat((occupancyMultiplier * peakMultiplier).toFixed(2));
    const effectiveHourlyRate = Math.round(stats.base_hourly_rate * finalMultiplier);
    const estimatedTotal = Math.round(effectiveHourlyRate * requestedHours);

    // Human-readable Tier Label
    let tierLabel = 'Standard Rate';
    if (occupancyPct >= 90) tierLabel = 'High Demand Surge (90%+ Occupancy)';
    else if (occupancyPct >= 75) tierLabel = 'Peak Demand Surge (75-90% Occupancy)';
    else if (occupancyPct >= 50) tierLabel = 'Moderate Demand (50-75% Occupancy)';
    else tierLabel = 'Low Demand / Economy Rate (<50% Occupancy)';

    return {
        locationId: stats.id,
        locationName: stats.name,
        baseHourlyRate: stats.base_hourly_rate,
        currentOccupancyPct: occupancyPct,
        totalSlots,
        occupiedSlots,
        availableSlots: totalSlots - occupiedSlots,
        isPeakHour,
        currentHour,
        dynamicMultiplier: finalMultiplier,
        effectiveHourlyRate,
        tierLabel,
        estimatedTotal,
        surgeApplied: finalMultiplier > 1.0
    };
}

module.exports = {
    calculateDynamicPrice
};
