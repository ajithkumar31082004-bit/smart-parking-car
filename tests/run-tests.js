const http = require('http');
const app = require('../backend/src/server');
const seedDatabase = require('../database/seed');

let server;
const PORT = 5099;

function request(method, path, body = null, headers = {}) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: '127.0.0.1',
            port: PORT,
            path,
            method,
            headers: {
                'Content-Type': 'application/json',
                ...headers
            }
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    resolve({ status: res.statusCode, body: parsed });
                } catch (e) {
                    resolve({ status: res.statusCode, text: data });
                }
            });
        });

        req.on('error', (err) => reject(err));

        if (body) {
            req.write(JSON.stringify(body));
        }
        req.end();
    });
}

async function runTests() {
    console.log('\n======================================================');
    console.log('🧪 SMARTPARK AI — AUTOMATED TEST SUITE');
    console.log('======================================================\n');

    let passed = 0;
    let failed = 0;

    function assert(condition, testName) {
        if (condition) {
            console.log(`  [PASS] ${testName}`);
            passed++;
        } else {
            console.error(`  [FAIL] ${testName}`);
            failed++;
        }
    }

    try {
        // 1. Seed fresh DB
        await seedDatabase();

        // 2. Start test server
        server = app.listen(PORT);

        // Test 1: Health Check
        const healthRes = await request('GET', '/api/health');
        assert(healthRes.status === 200 && healthRes.body.status === 'healthy', '1. System Health API (/api/health)');

        // Test 2: User Login (Customer)
        const loginRes = await request('POST', '/api/auth/login', {
            email: 'customer@smartpark.ai',
            password: 'Password@123'
        });
        assert(loginRes.status === 200 && Boolean(loginRes.body.token), '2. Customer Authentication & JWT Token Issuance');
        const customerToken = loginRes.body.token;

        // Test 3: Admin Login
        const adminLoginRes = await request('POST', '/api/auth/login', {
            email: 'admin@smartpark.ai',
            password: 'Password@123'
        });
        assert(adminLoginRes.status === 200 && adminLoginRes.body.user.role === 'admin', '3. Admin Role RBAC Login');
        const adminToken = adminLoginRes.body.token;

        // Test 4: Staff Login
        const staffLoginRes = await request('POST', '/api/auth/login', {
            email: 'staff@smartpark.ai',
            password: 'Password@123'
        });
        assert(staffLoginRes.status === 200 && staffLoginRes.body.user.role === 'staff', '4. Gate Staff Attendant Login');
        const staffToken = staffLoginRes.body.token;

        // Test 5: Get Parking Locations
        const locsRes = await request('GET', '/api/locations');
        assert(locsRes.status === 200 && locsRes.body.locations.length >= 4, '5. Fetch All Parking Hubs with Live Availability');

        // Test 6: Get Hierarchical Slots for Location 1
        const slotsRes = await request('GET', '/api/locations/1/slots');
        assert(slotsRes.status === 200 && slotsRes.body.floors.length === 3, '6. Hierarchical Floors & Slots Matrix (/api/locations/1/slots)');

        // Test 7: AI Smart Recommendation Engine
        const aiRecRes = await request('GET', '/api/ai/recommendations?lat=13.0500&lon=80.2400&isEv=true');
        assert(aiRecRes.status === 200 && aiRecRes.body.recommendations[0].aiMatchPercentage >= 70, '7. AI Multi-Criteria Weighted Recommendation Engine');

        // Test 8: AI Occupancy Forecast (24 Hours)
        const forecastRes = await request('GET', '/api/ai/forecast?locationId=1&hours=24');
        assert(forecastRes.status === 200 && forecastRes.body.forecast.length === 24, '8. AI Demand & Occupancy Forecasting Timeseries Engine');

        // Test 9: Dynamic Surge Pricing Calculation
        const dynamicPriceRes = await request('GET', '/api/ai/dynamic-pricing?locationId=1&hours=3');
        assert(dynamicPriceRes.status === 200 && dynamicPriceRes.body.effectiveHourlyRate > 0, '9. Dynamic Surge Pricing Tier Engine');

        // Test 10: Create Booking (Reserve Slot A01)
        const createBookingRes = await request('POST', '/api/bookings', {
            slotId: 1,
            vehicleNumber: 'TN-01-AB-1234',
            vehicleType: 'ev',
            durationHours: 2,
            requiresEvCharging: true,
            evChargeDurationHours: 1,
            discountCode: 'SMART20'
        }, { Authorization: `Bearer ${customerToken}` });

        assert(createBookingRes.status === 201 && createBookingRes.body.booking.bookingCode.startsWith('SP-2026-'), '10. Create Smart Reservation & Lock Slot');
        const newBooking = createBookingRes.body.booking;

        // Test 11: Process Payment
        const paymentRes = await request('POST', '/api/payments/process', {
            bookingId: newBooking.id,
            paymentMethod: 'upi',
            amount: newBooking.totalAmount,
            upiId: 'customer@okaxis'
        }, { Authorization: `Bearer ${customerToken}` });

        assert(paymentRes.status === 201 && paymentRes.body.payment.status === 'completed', '11. Payment Gateway Settlement & Transaction Token');

        // Test 12: Verify Generated Digital Pass & QR
        const passRes = await request('GET', `/api/bookings/pass/${newBooking.bookingCode}`);
        assert(passRes.status === 200 && Boolean(passRes.body.booking.qrDataUrl), '12. Digital Pass & High-Resolution QR Generation');

        // Test 13: Staff Optical Gate Check-In
        const checkInRes = await request('POST', '/api/qr/check-in', {
            code: newBooking.bookingCode
        }, { Authorization: `Bearer ${staffToken}` });

        assert(checkInRes.status === 200 && checkInRes.body.action === 'CHECK_IN', '13. Staff Gate Scanner Optical Check-In & Slot Occupation');

        // Test 14: Staff Optical Gate Check-Out
        const checkOutRes = await request('POST', '/api/qr/check-out', {
            code: newBooking.bookingCode
        }, { Authorization: `Bearer ${staffToken}` });

        assert(checkOutRes.status === 200 && checkOutRes.body.action === 'CHECK_OUT', '14. Staff Gate Scanner Check-Out & Slot Release');

        // Test 15: Admin Executive KPIs
        const kpiRes = await request('GET', '/api/admin/analytics/kpis', null, {
            Authorization: `Bearer ${adminToken}`
        });
        assert(kpiRes.status === 200 && kpiRes.body.kpis.revenue.allTime > 0, '15. Admin Executive KPIs & Occupancy Analytics');

        // Test 16: Admin Chart Feeds
        const chartRes = await request('GET', '/api/admin/analytics/charts', null, {
            Authorization: `Bearer ${adminToken}`
        });
        assert(chartRes.status === 200 && Array.isArray(chartRes.body.charts.hourlyOccupancy), '16. Admin Timeseries Chart Streams');

        // Test 17: Security RBAC Protection (Customer blocked from Admin APIs)
        const forbiddenRes = await request('GET', '/api/admin/analytics/kpis', null, {
            Authorization: `Bearer ${customerToken}`
        });
        assert(forbiddenRes.status === 403, '17. Security Role Authorization Guard (403 Forbidden for Non-Admins)');

        // ── EDGE CASE & NEGATIVE PATH TESTS ─────────────────────────────────

        // Test 18: Duplicate email registration → 409 Conflict
        const dupRegRes = await request('POST', '/api/auth/register', {
            name: 'Duplicate User',
            email: 'customer@smartpark.ai',  // already exists
            password: 'Password@123',
            phone: '+91 00000 00000'
        });
        assert(dupRegRes.status === 409, '18. Duplicate Email Registration Rejected (409 Conflict)');

        // Test 19: Wrong password → 401 Unauthorized
        const wrongPwdRes = await request('POST', '/api/auth/login', {
            email: 'customer@smartpark.ai',
            password: 'WrongPassword!'
        });
        assert(wrongPwdRes.status === 401, '19. Invalid Password Rejected (401 Unauthorized)');

        // Test 20: Create booking without auth token → 401 Unauthorized
        const unauthBookingRes = await request('POST', '/api/bookings', {
            slotId: 5,
            vehicleNumber: 'TN-01-XY-9999',
            vehicleType: 'car',
            durationHours: 1
        });
        assert(unauthBookingRes.status === 401, '20. Unauthenticated Booking Rejected (401 Unauthorized)');

        // Test 21: Booking with a non-existent slotId → 400 or 404
        const badSlotRes = await request('POST', '/api/bookings', {
            slotId: 99999,
            vehicleNumber: 'TN-01-AB-1234',
            vehicleType: 'car',
            durationHours: 1
        }, { Authorization: `Bearer ${customerToken}` });
        assert(badSlotRes.status === 400 || badSlotRes.status === 404, '21. Invalid Slot ID Booking Rejected (400/404)');

        // Test 22: Cancel a booking belonging to the logged-in customer
        // Create a fresh booking first, then cancel it
        const freshBooking = await request('POST', '/api/bookings', {
            slotId: 6,
            vehicleNumber: 'TN-01-AB-1234',
            vehicleType: 'car',
            durationHours: 1
        }, { Authorization: `Bearer ${customerToken}` });
        let cancelOk = false;
        if (freshBooking.status === 201 && freshBooking.body.booking) {
            const cancelRes = await request('POST', `/api/bookings/${freshBooking.body.booking.id}/cancel`, null, {
                Authorization: `Bearer ${customerToken}`
            });
            cancelOk = cancelRes.status === 200 && cancelRes.body.success === true;
        }
        assert(cancelOk, '22. Customer Booking Cancellation & Slot Release');

        // Test 23: Submit a review for the completed booking (booking from test 14 is completed)
        const reviewRes = await request('POST', '/api/bookings/review', {
            bookingId: newBooking.id,
            rating: 5,
            comment: 'Excellent EV charging facilities!'
        }, { Authorization: `Bearer ${customerToken}` });
        assert(reviewRes.status === 201 || reviewRes.status === 200, '23. Customer Review Submission After Checkout');

        // Test 24: Register a new vehicle in customer garage
        const vehicleRes = await request('POST', '/api/vehicles', {
            vehicleNumber: 'KA-05-MN-5678',
            vehicleType: 'car',
            vehicleName: 'Honda City',
            isEv: false
        }, { Authorization: `Bearer ${customerToken}` });
        assert(vehicleRes.status === 201, '24. Customer Vehicle Registration in Garage');

        // Test 25: Manager login & intermediate RBAC (can access locations but not admin KPIs)
        const managerLoginRes = await request('POST', '/api/auth/login', {
            email: 'manager@smartpark.ai',
            password: 'Password@123'
        });
        const managerOk = managerLoginRes.status === 200 && managerLoginRes.body.user.role === 'manager';
        let managerRBACOk = false;
        if (managerOk) {
            const managerToken = managerLoginRes.body.token;
            const managerForbidden = await request('GET', '/api/admin/fraud-events', null, {
                Authorization: `Bearer ${managerToken}`
            });
            // Manager is not admin — should be 403
            managerRBACOk = managerForbidden.status === 403;
        }
        assert(managerOk && managerRBACOk, '25. Manager Role Login & Intermediate RBAC Guard');

        console.log(`\n======================================================`);
        console.log(`📊 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
        console.log(`======================================================\n`);

        server.close();
        process.exit(failed > 0 ? 1 : 0);
    } catch (e) {
        console.error('Test execution error:', e);
        if (server) server.close();
        process.exit(1);
    }
}

if (require.main === module) {
    runTests();
}

module.exports = runTests;
