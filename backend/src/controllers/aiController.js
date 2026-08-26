const { getSmartRecommendations } = require('../services/aiRecommendationService');
const { forecastOccupancy } = require('../services/demandPredictionService');
const { calculateDynamicPrice } = require('../services/dynamicPricingService');

// Get AI Recommendations
exports.getRecommendations = async (req, res, next) => {
    try {
        const { lat, lon, isEv, vehicleType, maxPrice } = req.query;

        const userParams = {
            userLat: lat ? parseFloat(lat) : 13.0500,
            userLon: lon ? parseFloat(lon) : 80.2400,
            isEv: isEv === 'true' || isEv === '1',
            vehicleType: vehicleType || 'car',
            preferredMaxPrice: maxPrice ? parseFloat(maxPrice) : 80,
            userId: req.user ? req.user.id : null
        };

        const recommendations = await getSmartRecommendations(userParams);

        res.json({
            success: true,
            model: 'SmartPark-MultiCriteria-WeightedAI-v2',
            count: recommendations.length,
            recommendations
        });
    } catch (err) {
        next(err);
    }
};

// Get Demand Forecast for a location
exports.getDemandForecast = async (req, res, next) => {
    try {
        const locationId = req.query.locationId || req.params.locationId || 1;
        const hoursAhead = parseInt(req.query.hours, 10) || 24;

        const forecast = await forecastOccupancy(locationId, hoursAhead);

        res.json({
            success: true,
            ...forecast
        });
    } catch (err) {
        next(err);
    }
};

// Get Dynamic Price quote for location & duration
exports.getDynamicPriceQuote = async (req, res, next) => {
    try {
        const { locationId = 1, hours = 2 } = req.query;

        const pricing = await calculateDynamicPrice(locationId, parseFloat(hours));

        res.json({
            success: true,
            ...pricing
        });
    } catch (err) {
        next(err);
    }
};
