const { get, query, run } = require('../../../database/db');
const { calculateDynamicPrice } = require('../services/dynamicPricingService');
const { assessBookingRisk } = require('../services/fraudDetectionService');
const { generateBookingQRCode } = require('../services/qrService');
const { TAX_RATE } = require('../config/constants');

// Create a new parking booking
exports.createBooking = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const {
            slotId,
            vehicleId,
            vehicleNumber,
            vehicleType = 'car',
            startTime = new Date().toISOString(),
            durationHours = 2,
            requiresEvCharging = false,
            evChargeDurationHours = 1,
            discountCode = null
        } = req.body;

        if (!slotId) {
            return res.status(400).json({ success: false, error: 'slotId is required.' });
        }

        // 1. Verify Slot is available
        const slot = await get(`
            SELECT 
                ps.*,
                pz.zone_name,
                pf.floor_name,
                pf.location_id,
                pl.name as location_name,
                pl.base_hourly_rate,
                ec.id as charger_id,
                ec.power_kw,
                ec.rate_per_kwh
            FROM parking_slots ps
            JOIN parking_zones pz ON ps.zone_id = pz.id
            JOIN parking_floors pf ON pz.floor_id = pf.id
            JOIN parking_locations pl ON pf.location_id = pl.id
            LEFT JOIN ev_chargers ec ON ps.id = ec.slot_id
            WHERE ps.id = ?
        `, [slotId]);

        if (!slot) {
            return res.status(404).json({ success: false, error: 'Selected parking slot does not exist.' });
        }

        if (slot.status !== 'available') {
            return res.status(400).json({
                success: false,
                error: `Slot ${slot.slot_number} is currently ${slot.status}. Please choose an available slot.`
            });
        }

        // 2. Compute dynamic pricing
        const dynamicPricing = await calculateDynamicPrice(slot.location_id, durationHours);
        const dynamicMultiplier = dynamicPricing.dynamicMultiplier;
        const effectiveRate = Math.round(slot.base_hourly_rate * dynamicMultiplier);
        const baseCharge = effectiveRate * Number(durationHours);

        // 3. EV Charging Calculation
        let evCharge = 0;
        let evKwhEstimated = 0;
        if (requiresEvCharging && slot.slot_type === 'ev' && slot.charger_id) {
            const evHours = Math.min(Number(durationHours), Number(evChargeDurationHours) || 1);
            // Approx power consumed
            evKwhEstimated = (slot.power_kw || 22) * 0.4 * evHours; // realistic battery acceptance factor
            evCharge = Math.round(evKwhEstimated * (slot.rate_per_kwh || 15));
        }

        // 4. Discount Code logic
        let discount = 0;
        if (discountCode && discountCode.toUpperCase() === 'SMART20') {
            discount = Math.round((baseCharge + evCharge) * 0.20);
        } else if (discountCode && discountCode.toUpperCase() === 'FIRSTPARK') {
            discount = 50;
        }

        // 5. Tax Calculation
        const subtotal = Math.max(0, baseCharge + evCharge - discount);
        const tax = parseFloat((subtotal * TAX_RATE).toFixed(2));
        const totalAmount = parseFloat((subtotal + tax).toFixed(2));

        // 6. Fraud & Risk Assessment
        const riskAssessment = await assessBookingRisk({
            userId,
            bookingAmount: totalAmount,
            vehicleType,
            slotId
        });

        if (!riskAssessment.actionAllowed) {
            return res.status(403).json({
                success: false,
                error: 'Booking suspended due to anomalous transaction patterns. Please contact support.',
                riskScore: riskAssessment.riskScore
            });
        }

        // 7. Generate Booking Code & QR token
        const bookingSeq = Math.floor(100000 + Math.random() * 900000);
        const bookingCode = `SP-2026-${bookingSeq}`;
        const vNum = vehicleNumber || 'TN-01-XX-0000';

        const { qrToken, qrDataUrl } = await generateBookingQRCode(bookingCode, slot.slot_number, vNum);

        // Calculate start and end times
        const startDate = new Date(startTime);
        const endDate = new Date(startDate.getTime() + durationHours * 60 * 60 * 1000);

        // 8. Insert Booking Record
        const bookingRes = await run(`
            INSERT INTO bookings (
                booking_code, user_id, slot_id, vehicle_id, start_time, end_time,
                duration_hours, status, base_charge, ev_charge, tax, discount,
                total_amount, dynamic_multiplier, qr_token
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 'confirmed', ?, ?, ?, ?, ?, ?, ?)
        `, [
            bookingCode, userId, slotId, vehicleId || null, startDate.toISOString(), endDate.toISOString(),
            durationHours, baseCharge, evCharge, tax, discount, totalAmount, dynamicMultiplier, qrToken
        ]);

        const bookingId = bookingRes.lastID;

        // 9. Reserve / Lock Slot
        await run(`UPDATE parking_slots SET status = 'reserved', current_booking_id = ? WHERE id = ?`, [bookingId, slotId]);

        // 10. Record Charging Session if EV
        if (evCharge > 0 && slot.charger_id) {
            await run(`
                INSERT INTO charging_sessions (booking_id, charger_id, kwh_consumed, total_cost, status)
                VALUES (?, ?, ?, ?, 'active')
            `, [bookingId, slot.charger_id, evKwhEstimated, evCharge]);
        }

        // 11. Create in-app notification
        await run(`
            INSERT INTO notifications (user_id, title, message, type)
            VALUES (?, 'Reservation Confirmed', ?, 'booking')
        `, [userId, `Your booking ${bookingCode} for Slot ${slot.slot_number} at ${slot.location_name} is confirmed.`]);

        res.status(201).json({
            success: true,
            message: 'Booking created successfully!',
            booking: {
                id: bookingId,
                bookingCode,
                slotNumber: slot.slot_number,
                locationName: slot.location_name,
                floorName: slot.floor_name,
                zoneName: slot.zone_name,
                startTime: startDate.toISOString(),
                endTime: endDate.toISOString(),
                durationHours,
                baseCharge,
                evCharge,
                tax,
                discount,
                totalAmount,
                dynamicMultiplier,
                qrToken,
                qrDataUrl,
                status: 'confirmed',
                riskScore: riskAssessment.riskScore
            }
        });
    } catch (err) {
        next(err);
    }
};

// Get bookings for currently logged-in user
exports.getMyBookings = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const bookings = await query(`
            SELECT 
                b.*,
                ps.slot_number,
                ps.slot_type,
                pl.id as location_id,
                pl.name as location_name,
                pl.address as location_address,
                pf.floor_name,
                v.vehicle_number,
                v.vehicle_type,
                p.transaction_id,
                p.payment_method
            FROM bookings b
            JOIN parking_slots ps ON b.slot_id = ps.id
            JOIN parking_zones pz ON ps.zone_id = pz.id
            JOIN parking_floors pf ON pz.floor_id = pf.id
            JOIN parking_locations pl ON pf.location_id = pl.id
            LEFT JOIN vehicles v ON b.vehicle_id = v.id
            LEFT JOIN payments p ON b.id = p.booking_id
            WHERE b.user_id = ?
            ORDER BY b.created_at DESC
        `, [userId]);

        res.json({
            success: true,
            count: bookings.length,
            bookings
        });
    } catch (err) {
        next(err);
    }
};

// Get single booking by code or ID
exports.getBookingByCode = async (req, res, next) => {
    try {
        const { code } = req.params;
        const booking = await get(`
            SELECT 
                b.*,
                u.name as customer_name,
                u.email as customer_email,
                u.phone as customer_phone,
                ps.slot_number,
                ps.slot_type,
                pl.id as location_id,
                pl.name as location_name,
                pl.address as location_address,
                pl.city as location_city,
                pf.floor_name,
                pz.zone_name,
                v.vehicle_number,
                v.vehicle_type,
                v.brand as vehicle_brand,
                v.model as vehicle_model,
                p.transaction_id,
                p.payment_method,
                p.status as payment_status
            FROM bookings b
            JOIN users u ON b.user_id = u.id
            JOIN parking_slots ps ON b.slot_id = ps.id
            JOIN parking_zones pz ON ps.zone_id = pz.id
            JOIN parking_floors pf ON pz.floor_id = pf.id
            JOIN parking_locations pl ON pf.location_id = pl.id
            LEFT JOIN vehicles v ON b.vehicle_id = v.id
            LEFT JOIN payments p ON b.id = p.booking_id
            WHERE b.booking_code = ? OR b.id = ?
        `, [code, code]);

        if (!booking) {
            return res.status(404).json({ success: false, error: 'Booking pass not found.' });
        }

        // Generate QR code data URL for direct view/download
        const { qrDataUrl } = await generateBookingQRCode(booking.booking_code, booking.slot_number, booking.vehicle_number || 'TN-01-XX-0000');

        res.json({
            success: true,
            booking: {
                ...booking,
                qrDataUrl
            }
        });
    } catch (err) {
        next(err);
    }
};

// Cancel a booking
exports.cancelBooking = async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const booking = await get(`SELECT * FROM bookings WHERE id = ? AND (user_id = ? OR ? IN ('admin', 'superadmin'))`, [id, userId, req.user.role]);
        if (!booking) {
            return res.status(404).json({ success: false, error: 'Booking not found or access denied.' });
        }

        if (booking.status === 'cancelled' || booking.status === 'completed') {
            return res.status(400).json({ success: false, error: `Booking is already ${booking.status}.` });
        }

        // Free the slot
        await run(`UPDATE parking_slots SET status = 'available', current_booking_id = NULL WHERE id = ?`, [booking.slot_id]);

        // Mark booking cancelled
        await run(`UPDATE bookings SET status = 'cancelled', updated_at = datetime('now') WHERE id = ?`, [id]);

        // Notification
        await run(`
            INSERT INTO notifications (user_id, title, message, type)
            VALUES (?, 'Booking Cancelled', ?, 'warning')
        `, [booking.user_id, `Your reservation ${booking.booking_code} has been cancelled.`]);

        res.json({
            success: true,
            message: 'Booking cancelled successfully. Slot has been freed.',
            refundEstimated: booking.total_amount
        });
    } catch (err) {
        next(err);
    }
};

// Submit rating and review
exports.submitReview = async (req, res, next) => {
    try {
        const { bookingId, locationId, rating, comment } = req.body;
        const userId = req.user.id;

        if (!locationId || !rating) {
            return res.status(400).json({ success: false, error: 'Location ID and rating (1-5) are required.' });
        }

        await run(`
            INSERT INTO reviews (booking_id, user_id, location_id, rating, comment)
            VALUES (?, ?, ?, ?, ?)
        `, [bookingId || null, userId, locationId, rating, comment || null]);

        // Recompute average rating for location
        const avg = await get(`SELECT AVG(rating) as avg_rating, COUNT(*) as cnt FROM reviews WHERE location_id = ?`, [locationId]);
        if (avg) {
            await run(`UPDATE parking_locations SET rating = ?, review_count = ? WHERE id = ?`, [parseFloat(avg.avg_rating.toFixed(1)), avg.cnt, locationId]);
        }

        res.json({
            success: true,
            message: 'Thank you for your rating and feedback!'
        });
    } catch (err) {
        next(err);
    }
};
