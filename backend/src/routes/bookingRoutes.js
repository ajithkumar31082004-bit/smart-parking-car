const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const { authenticate } = require('../middleware/auth');

router.post('/', authenticate, bookingController.createBooking);
router.get('/my', authenticate, bookingController.getMyBookings);
router.get('/pass/:code', bookingController.getBookingByCode);
router.post('/:id/cancel', authenticate, bookingController.cancelBooking);
router.post('/review', authenticate, bookingController.submitReview);

module.exports = router;
