const { get, run } = require('../../../database/db');
const { v4: uuidv4 } = require('uuid');

// Process / Confirm Payment
exports.processPayment = async (req, res, next) => {
    try {
        const { bookingId, paymentMethod = 'upi', amount, upiId, cardLast4 } = req.body;

        if (!bookingId || !amount) {
            return res.status(400).json({ success: false, error: 'bookingId and amount are required.' });
        }

        const booking = await get(`SELECT * FROM bookings WHERE id = ?`, [bookingId]);
        if (!booking) {
            return res.status(404).json({ success: false, error: 'Booking not found.' });
        }

        // Generate realistic transaction ID
        const prefix = paymentMethod.toUpperCase();
        const txId = `TXN-${prefix}-${uuidv4().substring(0, 10).toUpperCase()}`;

        // Record payment
        const payRes = await run(`
            INSERT INTO payments (booking_id, transaction_id, payment_method, amount, currency, status, gateway_response)
            VALUES (?, ?, ?, ?, 'INR', 'completed', ?)
        `, [bookingId, txId, paymentMethod, amount, JSON.stringify({ upiId, cardLast4, processedAt: new Date().toISOString() })]);

        // Update booking status to confirmed if it was pending
        await run(`UPDATE bookings SET status = 'confirmed', updated_at = datetime('now') WHERE id = ?`, [bookingId]);

        res.status(201).json({
            success: true,
            message: 'Payment completed successfully!',
            payment: {
                id: payRes.lastID,
                transactionId: txId,
                paymentMethod,
                amount,
                currency: 'INR',
                status: 'completed',
                paidAt: new Date().toISOString()
            }
        });
    } catch (err) {
        next(err);
    }
};
