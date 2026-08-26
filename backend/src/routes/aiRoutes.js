const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const { optionalAuth } = require('../middleware/auth');

router.get('/recommendations', optionalAuth, aiController.getRecommendations);
router.get('/forecast', aiController.getDemandForecast);
router.get('/forecast/:locationId', aiController.getDemandForecast);
router.get('/dynamic-pricing', aiController.getDynamicPriceQuote);

module.exports = router;
