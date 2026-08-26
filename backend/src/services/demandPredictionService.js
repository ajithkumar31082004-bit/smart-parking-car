const { query } = require('../../../database/db');

/**
 * AI Demand & Occupancy Forecasting Service
 * Leverages historical occupancy records, day-of-week trends, and time-of-day regression
 * to forecast upcoming 24-hour parking demand curves.
 */
async function forecastOccupancy(locationId = 1, hoursAhead = 24) {
    // 1. Fetch historical aggregates grouped by day_of_week & hour_of_day
    const historicalAverages = await query(`
        SELECT 
            day_of_week,
            hour_of_day,
            AVG(occupancy_pct) as avg_occupancy,
            MIN(occupancy_pct) as min_occupancy,
            MAX(occupancy_pct) as max_occupancy,
            COUNT(*) as sample_count
        FROM occupancy_records
        WHERE location_id = ?
        GROUP BY day_of_week, hour_of_day
    `, [locationId]);

    // Build lookup map: `${day}_${hour}` -> stats
    const lookup = {};
    for (const row of historicalAverages) {
        lookup[`${row.day_of_week}_${row.hour_of_day}`] = row;
    }

    const now = new Date();
    const forecastPoints = [];
    let highDemandHours = [];

    for (let i = 1; i <= hoursAhead; i++) {
        const targetDate = new Date(now.getTime() + i * 60 * 60 * 1000);
        const targetHour = targetDate.getHours();
        const targetDay = targetDate.getDay();

        let predictedOccupancy = 45.0; // fallback baseline
        let lowerBound = 30.0;
        let upperBound = 60.0;

        const stat = lookup[`${targetDay}_${targetHour}`];
        if (stat) {
            predictedOccupancy = parseFloat(stat.avg_occupancy.toFixed(1));
            lowerBound = parseFloat(Math.max(10, stat.min_occupancy).toFixed(1));
            upperBound = parseFloat(Math.min(99, stat.max_occupancy).toFixed(1));
        } else {
            // Heuristic model if no exact history
            const isWeekend = (targetDay === 0 || targetDay === 6);
            if (targetHour >= 17 && targetHour <= 21) {
                predictedOccupancy = isWeekend ? 88.0 : 82.0;
            } else if (targetHour >= 11 && targetHour <= 15) {
                predictedOccupancy = isWeekend ? 80.0 : 72.0;
            } else if (targetHour >= 8 && targetHour <= 10) {
                predictedOccupancy = 65.0;
            } else if (targetHour >= 0 && targetHour <= 5) {
                predictedOccupancy = 18.0;
            }
            lowerBound = Math.max(10, predictedOccupancy - 12);
            upperBound = Math.min(99, predictedOccupancy + 12);
        }

        const demandLevel = predictedOccupancy >= 85 ? 'CRITICAL / FULL' : (predictedOccupancy >= 70 ? 'HIGH' : (predictedOccupancy >= 45 ? 'MODERATE' : 'LOW'));

        if (predictedOccupancy >= 75) {
            highDemandHours.push(`${targetHour}:00 (${predictedOccupancy}%)`);
        }

        forecastPoints.push({
            hourLabel: `${targetHour}:00`,
            timestamp: targetDate.toISOString(),
            hour: targetHour,
            day: targetDay,
            predictedOccupancyPct: predictedOccupancy,
            lowerConfidencePct: lowerBound,
            upperConfidencePct: upperBound,
            demandLevel,
            suggestedAction: predictedOccupancy >= 80 ? 'Reserve in advance — high probability of full capacity' : 'Immediate walk-in booking available'
        });
    }

    // AI summary insights
    const peakPoint = forecastPoints.reduce((max, p) => p.predictedOccupancyPct > max.predictedOccupancyPct ? p : max, forecastPoints[0]);

    return {
        locationId,
        forecastGeneratedAt: now.toISOString(),
        totalHoursForecasted: hoursAhead,
        peakPredictedDemand: {
            time: peakPoint.hourLabel,
            occupancyPct: peakPoint.predictedOccupancyPct,
            level: peakPoint.demandLevel
        },
        highDemandWindows: highDemandHours.slice(0, 4),
        forecast: forecastPoints,
        aiInsight: `Peak demand of ${peakPoint.predictedOccupancyPct}% expected at ${peakPoint.hourLabel}. Recommendation: Book at least 45 minutes ahead during high-demand windows.`
    };
}

module.exports = {
    forecastOccupancy
};
