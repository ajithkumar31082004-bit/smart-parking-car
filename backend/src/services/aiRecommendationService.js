const { query } = require('../../../database/db');

// Calculate Haversine distance in meters between user GPS and parking location
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Earth radius in meters
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
    const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

    const a =
        Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
        Math.cos(phi1) * Math.cos(phi2) *
        Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return Math.round(R * c); // Distance in meters
}

/**
 * AI Smart Parking Recommendation Engine
 * Multi-criteria weighted decision model with explainability
 */
async function getSmartRecommendations(userParams = {}) {
    const {
        userLat = 13.0500,
        userLon = 80.2400,
        isEv = false,
        vehicleType = 'car',
        preferredMaxPrice = 100,
        userId = null
    } = userParams;

    // Fetch all active parking locations with live slot counts
    const locations = await query(`
        SELECT 
            pl.*,
            (SELECT COUNT(*) FROM parking_slots ps 
             JOIN parking_zones pz ON ps.zone_id = pz.id 
             JOIN parking_floors pf ON pz.floor_id = pf.id 
             WHERE pf.location_id = pl.id AND ps.status = 'available') as live_available_slots,
            (SELECT COUNT(*) FROM parking_slots ps 
             JOIN parking_zones pz ON ps.zone_id = pz.id 
             JOIN parking_floors pf ON pz.floor_id = pf.id 
             WHERE pf.location_id = pl.id AND ps.slot_type = 'ev' AND ps.status = 'available') as live_ev_available_slots,
            (SELECT COUNT(*) FROM parking_slots ps 
             JOIN parking_zones pz ON ps.zone_id = pz.id 
             JOIN parking_floors pf ON pz.floor_id = pf.id 
             WHERE pf.location_id = pl.id) as live_total_slots
        FROM parking_locations pl
        WHERE pl.is_active = 1
    `);

    if (!locations.length) return [];

    const scoredLocations = locations.map(loc => {
        const distanceMeters = calculateDistance(userLat, userLon, loc.latitude, loc.longitude);
        const distanceKm = (distanceMeters / 1000).toFixed(1);

        const totalSlots = loc.live_total_slots || loc.total_slots || 1;
        const availableSlots = loc.live_available_slots !== undefined ? loc.live_available_slots : loc.available_slots;
        const availabilityRatio = Math.min(1.0, availableSlots / totalSlots);

        // 1. Distance Score (decay over 15km max)
        const distanceScore = Math.max(0, 1 - (distanceMeters / 15000));

        // 2. Price Score (cheaper = higher score)
        const priceScore = Math.max(0, 1 - (loc.base_hourly_rate / (preferredMaxPrice * 1.5)));

        // 3. Availability Score (availability ratio + safety margin)
        const availabilityScore = availabilityRatio >= 0.15 ? availabilityRatio : availabilityRatio * 0.5;

        // 4. EV Compatibility Score
        let evScore = 0.8;
        if (isEv) {
            evScore = loc.live_ev_available_slots > 0 ? 1.0 : (loc.has_ev_charging ? 0.4 : 0.0);
        }

        // 5. Quality / Rating Score
        const ratingScore = loc.rating / 5.0;

        // Weighted AI Composite Score
        const weights = isEv 
            ? { distance: 0.30, price: 0.20, availability: 0.25, ev: 0.15, rating: 0.10 }
            : { distance: 0.35, price: 0.25, availability: 0.25, ev: 0.00, rating: 0.15 };

        const totalComposite = (
            (distanceScore * weights.distance) +
            (priceScore * weights.price) +
            (availabilityScore * weights.availability) +
            (evScore * weights.ev) +
            (ratingScore * weights.rating)
        );

        const aiMatchPercentage = Math.round(Math.min(99, Math.max(45, totalComposite * 100)));

        // Generate Explainable AI Reasoning
        const reasons = [];
        if (distanceMeters < 1500) reasons.push(`Close proximity (${distanceMeters}m away)`);
        else reasons.push(`Accessible location (${distanceKm} km away)`);

        if (isEv && loc.live_ev_available_slots > 0) {
            reasons.push(`${loc.live_ev_available_slots} EV Fast Chargers currently available`);
        }
        if (loc.base_hourly_rate <= 50) {
            reasons.push(`Budget-friendly rate at ₹${loc.base_hourly_rate}/hr`);
        }
        if (availabilityRatio > 0.4) {
            reasons.push(`High slot availability (${availableSlots} spots free)`);
        }
        if (loc.rating >= 4.8) {
            reasons.push(`Top customer satisfaction rating (${loc.rating}★)`);
        }

        return {
            id: loc.id,
            name: loc.name,
            address: loc.address,
            city: loc.city,
            latitude: loc.latitude,
            longitude: loc.longitude,
            distanceMeters,
            distanceKm,
            baseHourlyRate: loc.base_hourly_rate,
            totalSlots,
            availableSlots,
            evAvailableSlots: loc.live_ev_available_slots,
            rating: loc.rating,
            reviewCount: loc.review_count,
            hasEvCharging: Boolean(loc.has_ev_charging),
            hasCoveredParking: Boolean(loc.has_covered_parking),
            imageUrl: loc.image_url,
            aiMatchPercentage,
            recommendationReason: `Recommended because: ${reasons.join(', ')}.`
        };
    });

    // Sort descending by AI match percentage
    scoredLocations.sort((a, b) => b.aiMatchPercentage - a.aiMatchPercentage);

    return scoredLocations;
}

module.exports = {
    getSmartRecommendations,
    calculateDistance
};
