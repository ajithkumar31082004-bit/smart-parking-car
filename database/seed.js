const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { db, exec, run, query, get } = require('./db');

async function seedDatabase() {
    console.log('🚀 [SEED] Starting SmartPark AI database migration and seeding...');

    try {
        // 1. Initialize schema
        const schemaPath = path.join(__dirname, 'schema.sql');
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');
        await exec(schemaSql);

        // Clean existing records in foreign key order
        await exec(`
            DELETE FROM audit_logs;
            DELETE FROM fraud_events;
            DELETE FROM charging_sessions;
            DELETE FROM ev_chargers;
            DELETE FROM payments;
            DELETE FROM bookings;
            DELETE FROM parking_slots;
            DELETE FROM parking_zones;
            DELETE FROM parking_floors;
            DELETE FROM pricing_rules;
            DELETE FROM reviews;
            DELETE FROM notifications;
            DELETE FROM occupancy_records;
            DELETE FROM vehicles;
            DELETE FROM parking_locations;
            DELETE FROM users;
            DELETE FROM system_settings;
            DELETE FROM sqlite_sequence;
        `);

        // 2. Hash default password
        const passwordHash = await bcrypt.hash('Password@123', 10);

        // 3. Insert Users & Map IDs
        const users = [
            { name: 'Super Administrator', email: 'superadmin@smartpark.ai', role: 'superadmin', phone: '+91 98765 43210' },
            { name: 'Operations Admin', email: 'admin@smartpark.ai', role: 'admin', phone: '+91 98765 43211' },
            { name: 'Facility Manager', email: 'manager@smartpark.ai', role: 'manager', phone: '+91 98765 43212' },
            { name: 'Gate Staff Attendant', email: 'staff@smartpark.ai', role: 'staff', phone: '+91 98765 43213' },
            { name: 'Ajith Kumar', email: 'customer@smartpark.ai', role: 'customer', phone: '+91 98765 43214' },
            { name: 'Sarah Chen', email: 'sarah.chen@example.com', role: 'customer', phone: '+91 98765 43215' },
            { name: 'David Miller', email: 'david.m@example.com', role: 'customer', phone: '+91 98765 43216' },
            { name: 'Priya Sharma', email: 'priya.s@example.com', role: 'customer', phone: '+91 98765 43217' }
        ];

        const userMap = {};
        for (const u of users) {
            const uRes = await run(
                `INSERT INTO users (name, email, password_hash, role, phone) VALUES (?, ?, ?, ?, ?)`,
                [u.name, u.email, passwordHash, u.role, u.phone]
            );
            userMap[u.email] = uRes.lastID;
        }
        console.log(`✅ [SEED] Seeded ${users.length} users.`);

        // 4. Insert Vehicles using mapped IDs
        const customerId = userMap['customer@smartpark.ai'];
        const sarahId = userMap['sarah.chen@example.com'];
        const davidId = userMap['david.m@example.com'];
        const priyaId = userMap['priya.s@example.com'];

        const vehicles = [
            { user_id: customerId, vehicle_number: 'TN-01-AB-1234', vehicle_type: 'car', brand: 'Hyundai', model: 'Ioniq 5', is_ev: 1, is_default: 1, color: 'Cyber Grey', fuel_type: 'electric' },
            { user_id: customerId, vehicle_number: 'TN-09-CD-5678', vehicle_type: 'suv', brand: 'Tata', model: 'Nexon EV', is_ev: 1, is_default: 0, color: 'Teal Blue', fuel_type: 'electric' },
            { user_id: sarahId, vehicle_number: 'KA-03-EF-9988', vehicle_type: 'car', brand: 'Honda', model: 'City', is_ev: 0, is_default: 1, color: 'White', fuel_type: 'petrol' },
            { user_id: davidId, vehicle_number: 'MH-02-XY-4455', vehicle_type: 'suv', brand: 'Tesla', model: 'Model Y', is_ev: 1, is_default: 1, color: 'Midnight Silver', fuel_type: 'electric' },
            { user_id: priyaId, vehicle_number: 'DL-01-PQ-7788', vehicle_type: 'bike', brand: 'Ather', model: '450X', is_ev: 1, is_default: 1, color: 'Space Grey', fuel_type: 'electric' }
        ];

        const vehicleMap = {};
        for (const v of vehicles) {
            const vRes = await run(
                `INSERT INTO vehicles (user_id, vehicle_number, vehicle_type, brand, model, color, fuel_type, is_ev, is_default)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [v.user_id, v.vehicle_number, v.vehicle_type, v.brand, v.model, v.color, v.fuel_type, v.is_ev, v.is_default]
            );
            vehicleMap[v.vehicle_number] = vRes.lastID;
        }
        console.log(`✅ [SEED] Seeded ${vehicles.length} vehicles.`);

        // 5. Insert Parking Locations
        const locations = [
            {
                name: 'Downtown Metro Smart Deck',
                address: '104 Anna Salai, Mount Road',
                city: 'Chennai',
                latitude: 13.0604,
                longitude: 80.2496,
                base_hourly_rate: 50.0,
                rating: 4.9,
                review_count: 142,
                image_url: 'https://images.unsplash.com/photo-1590674899484-d5640e854abe?auto=format&fit=crop&w=800&q=80'
            },
            {
                name: 'Silicon Tech Park Multi-Level Hub',
                address: 'OMR Cyber Gateway, Navalur',
                city: 'Chennai',
                latitude: 12.8452,
                longitude: 80.2268,
                base_hourly_rate: 40.0,
                rating: 4.8,
                review_count: 98,
                image_url: 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=800&q=80'
            },
            {
                name: 'Grand Central Lifestyle Mall Parking',
                address: 'Velachery Bypass Road, Phoenix Enclave',
                city: 'Chennai',
                latitude: 12.9915,
                longitude: 80.2173,
                base_hourly_rate: 60.0,
                rating: 4.7,
                review_count: 215,
                image_url: 'https://images.unsplash.com/photo-1573348722427-f1d6819fdf98?auto=format&fit=crop&w=800&q=80'
            },
            {
                name: 'Airport Terminal T3 Express Deck',
                address: 'GST Road, Meenambakkam',
                city: 'Chennai',
                latitude: 12.9815,
                longitude: 80.1638,
                base_hourly_rate: 80.0,
                rating: 4.9,
                review_count: 350,
                image_url: 'https://images.unsplash.com/photo-1526628953301-3e589a6a8b74?auto=format&fit=crop&w=800&q=80'
            }
        ];

        let locIds = [];
        for (const loc of locations) {
            const res = await run(
                `INSERT INTO parking_locations (name, address, city, latitude, longitude, base_hourly_rate, rating, review_count, image_url)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [loc.name, loc.address, loc.city, loc.latitude, loc.longitude, loc.base_hourly_rate, loc.rating, loc.review_count, loc.image_url]
            );
            locIds.push(res.lastID);
        }
        console.log(`✅ [SEED] Seeded ${locations.length} parking locations.`);

        // 6. Dynamic Pricing Rules per location
        for (const locId of locIds) {
            await run(`INSERT INTO pricing_rules (location_id, min_occupancy_pct, max_occupancy_pct, multiplier, peak_start_hour, peak_end_hour) VALUES (?, 0, 50, 1.0, 17, 21)`, [locId]);
            await run(`INSERT INTO pricing_rules (location_id, min_occupancy_pct, max_occupancy_pct, multiplier, peak_start_hour, peak_end_hour) VALUES (?, 50, 75, 1.25, 17, 21)`, [locId]);
            await run(`INSERT INTO pricing_rules (location_id, min_occupancy_pct, max_occupancy_pct, multiplier, peak_start_hour, peak_end_hour) VALUES (?, 75, 90, 1.50, 17, 21)`, [locId]);
            await run(`INSERT INTO pricing_rules (location_id, min_occupancy_pct, max_occupancy_pct, multiplier, peak_start_hour, peak_end_hour) VALUES (?, 90, 100, 1.80, 17, 21)`, [locId]);
        }

        // 7. Seed Floors, Zones, and Slots
        const primaryLocId = locIds[0];
        const floorsData = [
            { num: 0, name: 'Ground Floor (Level G)', zones: ['Zone A - EV Hub', 'Zone B - Express Fast Pass'] },
            { num: 1, name: 'First Floor (Level 1)', zones: ['Zone C - Premium Covered', 'Zone D - Standard Car'] },
            { num: 2, name: 'Second Floor (Level 2)', zones: ['Zone E - Long Term', 'Zone F - Economy Bay'] }
        ];

        let totalSlotsCount = 0;
        let availableSlotsCount = 0;
        let slot1Id = null;
        let slot2Id = null;
        let slot3Id = null;

        for (const f of floorsData) {
            const floorRes = await run(
                `INSERT INTO parking_floors (location_id, floor_number, floor_name, total_slots) VALUES (?, ?, ?, ?)`,
                [primaryLocId, f.num, f.name, 24]
            );
            const floorId = floorRes.lastID;

            for (let zIdx = 0; zIdx < f.zones.length; zIdx++) {
                const zName = f.zones[zIdx];
                const zoneType = zName.includes('EV') ? 'ev_fast' : 'standard';
                const zoneRes = await run(
                    `INSERT INTO parking_zones (floor_id, zone_name, zone_type) VALUES (?, ?, ?)`,
                    [floorId, zName, zoneType]
                );
                const zoneId = zoneRes.lastID;

                for (let s = 1; s <= 12; s++) {
                    const prefix = String.fromCharCode(65 + f.num * 2 + zIdx);
                    const slotNum = `${prefix}${s < 10 ? '0' + s : s}`;
                    const isEv = (prefix === 'A' && s <= 8) || (prefix === 'B' && s <= 4);
                    const isVip = (prefix === 'C' && s <= 3);
                    const isDisabled = (prefix === 'B' && (s === 11 || s === 12));

                    let slotType = 'normal';
                    if (isEv) slotType = 'ev';
                    else if (isVip) slotType = 'vip';
                    else if (isDisabled) slotType = 'disabled';

                    let status = 'available';
                    if (s === 2 || s === 5) status = 'occupied';
                    else if (s === 4) status = 'reserved';
                    else if (s === 12 && f.num === 2) status = 'maintenance';

                    totalSlotsCount++;
                    if (status === 'available') availableSlotsCount++;

                    const slotRes = await run(
                        `INSERT INTO parking_slots (zone_id, slot_number, slot_type, status, sensor_id)
                         VALUES (?, ?, ?, ?, ?)`,
                        [zoneId, slotNum, slotType, status, `IOT-SENSOR-${slotNum}`]
                    );

                    if (!slot1Id) slot1Id = slotRes.lastID;
                    else if (!slot2Id) slot2Id = slotRes.lastID;
                    else if (!slot3Id) slot3Id = slotRes.lastID;

                    if (isEv) {
                        const chargerStatus = (status === 'occupied') ? 'charging' : 'available';
                        await run(
                            `INSERT INTO ev_chargers (slot_id, charger_code, charger_type, power_kw, rate_per_kwh, status, total_energy_delivered_kwh)
                             VALUES (?, ?, ?, ?, ?, ?, ?)`,
                            [slotRes.lastID, `EV-${slotNum}`, s % 2 === 0 ? 'CCS2' : 'Type 2', 50.0, 15.0, chargerStatus, 320.5]
                        );
                    }
                }
            }
        }

        await run(`UPDATE parking_locations SET total_slots = ?, available_slots = ? WHERE id = ?`, [totalSlotsCount, availableSlotsCount, primaryLocId]);

        // Seed other 3 locations
        for (let i = 1; i < locIds.length; i++) {
            const locId = locIds[i];
            const flRes = await run(`INSERT INTO parking_floors (location_id, floor_number, floor_name, total_slots) VALUES (?, 0, 'Level 1 Main Deck', 20)`, [locId]);
            const znRes = await run(`INSERT INTO parking_zones (floor_id, zone_name, zone_type) VALUES (?, 'Zone Main', 'standard')`, [flRes.lastID]);
            
            for (let s = 1; s <= 20; s++) {
                const sNum = `M${s < 10 ? '0' + s : s}`;
                const sType = s <= 4 ? 'ev' : 'normal';
                const st = s % 4 === 0 ? 'occupied' : 'available';
                const sRes = await run(`INSERT INTO parking_slots (zone_id, slot_number, slot_type, status, sensor_id) VALUES (?, ?, ?, ?, ?)`,
                    [znRes.lastID, sNum, sType, st, `IOT-${locId}-${sNum}`]);
                if (sType === 'ev') {
                    await run(`INSERT INTO ev_chargers (slot_id, charger_code, charger_type, power_kw, rate_per_kwh, status) VALUES (?, ?, 'Type 2', 22.0, 14.0, 'available')`,
                        [sRes.lastID, `EV-${locId}-${sNum}`]);
                }
            }
            await run(`UPDATE parking_locations SET total_slots = 20, available_slots = 15 WHERE id = ?`, [locId]);
        }

        // 8. Seed Bookings
        const sampleBookings = [
            {
                code: 'SP-2026-000101',
                user_id: customerId,
                slot_id: slot1Id,
                vehicle_id: vehicleMap['TN-01-AB-1234'],
                hours: 2.5,
                status: 'confirmed',
                base_charge: 125.0,
                ev_charge: 75.0,
                tax: 36.0,
                discount: 20.0,
                total: 216.0,
                multiplier: 1.0,
                qr_token: 'QR-PASS-SP2026000101-SECURE-A01',
                method: 'upi',
                tx_id: 'TXN-UPI-994827104'
            },
            {
                code: 'SP-2026-000102',
                user_id: sarahId,
                slot_id: slot2Id,
                vehicle_id: vehicleMap['KA-03-EF-9988'],
                hours: 4.0,
                status: 'active',
                base_charge: 200.0,
                ev_charge: 0.0,
                tax: 36.0,
                discount: 0.0,
                total: 236.0,
                multiplier: 1.25,
                qr_token: 'QR-PASS-SP2026000102-SECURE-A02',
                method: 'card',
                tx_id: 'TXN-CARD-883921034'
            },
            {
                code: 'SP-2026-000103',
                user_id: davidId,
                slot_id: slot3Id,
                vehicle_id: vehicleMap['MH-02-XY-4455'],
                hours: 1.5,
                status: 'completed',
                base_charge: 75.0,
                ev_charge: 60.0,
                tax: 24.3,
                discount: 10.0,
                total: 149.3,
                multiplier: 1.0,
                qr_token: 'QR-PASS-SP2026000103-SECURE-A03',
                method: 'netbanking',
                tx_id: 'TXN-NB-112233445'
            }
        ];

        for (const b of sampleBookings) {
            const bRes = await run(
                `INSERT INTO bookings (
                    booking_code, user_id, slot_id, vehicle_id, start_time, end_time, 
                    duration_hours, status, base_charge, ev_charge, tax, discount, 
                    total_amount, dynamic_multiplier, qr_token
                 ) VALUES (?, ?, ?, ?, datetime('now', '-1 hours'), datetime('now', '+2 hours'), ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [b.code, b.user_id, b.slot_id, b.vehicle_id, b.hours, b.status, b.base_charge, b.ev_charge, b.tax, b.discount, b.total, b.multiplier, b.qr_token]
            );

            await run(
                `INSERT INTO payments (booking_id, transaction_id, payment_method, amount, currency, status)
                 VALUES (?, ?, ?, ?, 'INR', 'completed')`,
                [bRes.lastID, b.tx_id, b.method, b.total]
            );

            if (b.ev_charge > 0) {
                await run(
                    `INSERT INTO charging_sessions (booking_id, charger_id, kwh_consumed, total_cost, status)
                     VALUES (?, 1, 5.0, ?, 'active')`,
                    [bRes.lastID, b.ev_charge]
                );
            }
        }
        console.log(`✅ [SEED] Seeded ${sampleBookings.length} initial bookings & payments.`);

        // 9. Historical Timeseries Occupancy
        const now = new Date();
        for (let daysAgo = 14; daysAgo >= 0; daysAgo--) {
            for (let hour = 6; hour <= 23; hour++) {
                const recDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
                recDate.setHours(hour, 0, 0, 0);

                const dayOfWeek = recDate.getDay();
                const isWeekend = (dayOfWeek === 0 || dayOfWeek === 6) ? 1 : 0;
                
                let baseOcc = 0.35;
                if ((hour >= 11 && hour <= 14) || (hour >= 17 && hour <= 21)) {
                    baseOcc = isWeekend ? 0.88 : 0.78;
                } else if (hour >= 8 && hour <= 10) {
                    baseOcc = 0.62;
                }
                const jitter = (Math.sin(hour * 3 + daysAgo) * 0.08);
                const occPct = Math.min(0.98, Math.max(0.15, baseOcc + jitter));
                const occupied = Math.round(72 * occPct);

                await run(
                    `INSERT INTO occupancy_records (location_id, timestamp, occupied_slots, total_slots, occupancy_pct, day_of_week, hour_of_day, is_weekend)
                     VALUES (?, ?, ?, 72, ?, ?, ?, ?)`,
                    [primaryLocId, recDate.toISOString(), occupied, parseFloat((occPct * 100).toFixed(1)), dayOfWeek, hour, isWeekend]
                );
            }
        }

        // 10. Reviews, Notifications, Fraud Events, Audit Logs
        await run(`INSERT INTO reviews (booking_id, user_id, location_id, rating, comment) VALUES (3, ?, 1, 5, 'Super smooth EV fast charging and easy QR gate entry!')`, [davidId]);
        await run(`INSERT INTO reviews (booking_id, user_id, location_id, rating, comment) VALUES (2, ?, 1, 4, 'Very clean facility, clear floor guidance signs.')`, [sarahId]);

        await run(`INSERT INTO notifications (user_id, title, message, type) VALUES (?, 'Booking Confirmed', 'Your reservation SP-2026-000101 for slot A01 is active.', 'booking')`, [customerId]);
        await run(`INSERT INTO notifications (user_id, title, message, type) VALUES (?, 'EV Charging Ready', 'Slot A01 50kW DC Fast Charger is configured and ready.', 'ev')`, [customerId]);

        await run(`INSERT INTO fraud_events (user_id, booking_id, risk_score, risk_level, reason, details) VALUES 
            (?, NULL, 78, 'HIGH', 'Rapid Multi-Booking Spike', 'User attempted 5 concurrent bookings within 90 seconds from distinct IP locations.')`, [priyaId]);

        await run(`INSERT INTO audit_logs (user_id, action, target_entity, entity_id, details) VALUES 
            (?, 'UPDATE_SLOT_STATUS', 'parking_slots', 12, 'Slot C12 put into Maintenance mode for sensor calibration.')`, [userMap['admin@smartpark.ai']]);

        // 11. System settings
        await run(`INSERT INTO system_settings (key, value, description) VALUES ('gst_rate_pct', '18', 'GST Tax rate on parking services')`);
        await run(`INSERT INTO system_settings (key, value, description) VALUES ('cancellation_grace_hours', '2', 'Free cancellation window prior to start time')`);
        await run(`INSERT INTO system_settings (key, value, description) VALUES ('surge_pricing_enabled', 'true', 'Dynamic occupancy surge pricing toggle')`);

        console.log('🎉 [SEED] SmartPark AI database migration & seeding completed successfully!');
    } catch (err) {
        console.error('❌ [SEED] Error during seeding:', err);
        throw err;
    }
}

if (require.main === module) {
    seedDatabase().catch(() => process.exit(1));
}

module.exports = seedDatabase;
