const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');
const { get, run } = require('../../../database/db');

/**
 * QR Code & Pass Service
 */
async function generateBookingQRCode(bookingCode, slotNumber, vehicleNumber) {
    const qrToken = `SP-PASS-${bookingCode}-${uuidv4().substring(0, 8).toUpperCase()}`;
    const payload = JSON.stringify({
        bookingCode,
        slot: slotNumber,
        vehicle: vehicleNumber,
        token: qrToken,
        issuedAt: new Date().toISOString()
    });

    // Generate base64 Data URL for instant rendering on frontend / receipt
    const qrDataUrl = await QRCode.toDataURL(payload, {
        errorCorrectionLevel: 'H',
        margin: 2,
        color: {
            dark: '#1e40af', // Deep blue
            light: '#ffffff'
        }
    });

    return {
        qrToken,
        qrDataUrl,
        payload
    };
}

/**
 * Verify and process QR Check-in / Check-out
 */
async function verifyAndProcessQR(qrTokenOrBookingCode, staffUserId, action = 'check-in') {
    const booking = await get(`
        SELECT 
            b.*,
            u.name as customer_name,
            u.email as customer_email,
            u.phone as customer_phone,
            ps.slot_number,
            ps.slot_type,
            ps.status as slot_status,
            pl.name as location_name,
            pl.id as location_id,
            v.vehicle_number,
            v.vehicle_type
        FROM bookings b
        JOIN users u ON b.user_id = u.id
        JOIN parking_slots ps ON b.slot_id = ps.id
        JOIN parking_zones pz ON ps.zone_id = pz.id
        JOIN parking_floors pf ON pz.floor_id = pf.id
        JOIN parking_locations pl ON pf.location_id = pl.id
        LEFT JOIN vehicles v ON b.vehicle_id = v.id
        WHERE b.qr_token = ? OR b.booking_code = ?
    `, [qrTokenOrBookingCode, qrTokenOrBookingCode]);

    if (!booking) {
        return {
            success: false,
            error: 'Invalid QR Pass: No matching booking record found in the system.'
        };
    }

    const now = new Date().toISOString();

    if (action === 'check-in') {
        if (booking.status === 'completed' || booking.status === 'cancelled') {
            return {
                success: false,
                error: `Cannot check-in: Booking status is already '${booking.status}'.`
            };
        }

        // Update booking to active and slot to occupied
        await run(`UPDATE bookings SET status = 'active', check_in_time = ?, updated_at = ? WHERE id = ?`, [now, now, booking.id]);
        await run(`UPDATE parking_slots SET status = 'occupied', current_booking_id = ?, last_status_change = ? WHERE id = ?`, [booking.id, now, booking.slot_id]);

        // Audit log
        await run(`
            INSERT INTO audit_logs (user_id, action, target_entity, entity_id, details)
            VALUES (?, 'STAFF_QR_CHECKIN', 'bookings', ?, ?)
        `, [staffUserId, booking.id, `Vehicle ${booking.vehicle_number} checked in to slot ${booking.slot_number}`]);

        return {
            success: true,
            message: 'Vehicle Check-In Successful',
            action: 'CHECK_IN',
            timestamp: now,
            booking: {
                bookingCode: booking.booking_code,
                customerName: booking.customer_name,
                vehicleNumber: booking.vehicle_number,
                slotNumber: booking.slot_number,
                slotType: booking.slot_type,
                locationName: booking.location_name,
                durationHours: booking.duration_hours,
                status: 'active'
            }
        };
    } else if (action === 'check-out') {
        // Update booking to completed and slot to available
        await run(`UPDATE bookings SET status = 'completed', check_out_time = ?, updated_at = ? WHERE id = ?`, [now, now, booking.id]);
        await run(`UPDATE parking_slots SET status = 'available', current_booking_id = NULL, last_status_change = ? WHERE id = ?`, [now, booking.slot_id]);

        // If EV slot, complete charging session
        await run(`UPDATE charging_sessions SET status = 'completed', completed_at = ? WHERE booking_id = ? AND status = 'active'`, [now, booking.id]);

        // Audit log
        await run(`
            INSERT INTO audit_logs (user_id, action, target_entity, entity_id, details)
            VALUES (?, 'STAFF_QR_CHECKOUT', 'bookings', ?, ?)
        `, [staffUserId, booking.id, `Vehicle ${booking.vehicle_number} checked out from slot ${booking.slot_number}`]);

        return {
            success: true,
            message: 'Vehicle Check-Out Successful. Slot is now Available.',
            action: 'CHECK_OUT',
            timestamp: now,
            booking: {
                bookingCode: booking.booking_code,
                customerName: booking.customer_name,
                vehicleNumber: booking.vehicle_number,
                slotNumber: booking.slot_number,
                locationName: booking.location_name,
                status: 'completed'
            }
        };
    }

    return { success: false, error: 'Unsupported gate action' };
}

module.exports = {
    generateBookingQRCode,
    verifyAndProcessQR
};
