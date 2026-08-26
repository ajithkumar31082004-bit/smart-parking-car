-- ==========================================================
-- SmartPark AI - Enterprise Relational Database Schema
-- Compatible with SQLite3 & PostgreSQL
-- ==========================================================

PRAGMA foreign_keys = ON;

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'customer' CHECK(role IN ('customer', 'staff', 'manager', 'admin', 'superadmin')),
    phone TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. Vehicles Table
CREATE TABLE IF NOT EXISTS vehicles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    vehicle_number TEXT UNIQUE NOT NULL,
    vehicle_type TEXT NOT NULL DEFAULT 'car' CHECK(vehicle_type IN ('car', 'suv', 'bike', 'van', 'ev')),
    brand TEXT,
    model TEXT,
    color TEXT,
    fuel_type TEXT DEFAULT 'petrol',
    is_ev INTEGER NOT NULL DEFAULT 0,
    is_default INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 3. Parking Locations Table
CREATE TABLE IF NOT EXISTS parking_locations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    city TEXT NOT NULL,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    base_hourly_rate REAL NOT NULL DEFAULT 40.0,
    total_slots INTEGER NOT NULL DEFAULT 0,
    available_slots INTEGER NOT NULL DEFAULT 0,
    rating REAL NOT NULL DEFAULT 4.8,
    review_count INTEGER NOT NULL DEFAULT 0,
    has_ev_charging INTEGER NOT NULL DEFAULT 1,
    has_covered_parking INTEGER NOT NULL DEFAULT 1,
    has_cctv INTEGER NOT NULL DEFAULT 1,
    is_24_7 INTEGER NOT NULL DEFAULT 1,
    is_active INTEGER NOT NULL DEFAULT 1,
    image_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 4. Parking Floors Table
CREATE TABLE IF NOT EXISTS parking_floors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    location_id INTEGER NOT NULL,
    floor_number INTEGER NOT NULL,
    floor_name TEXT NOT NULL,
    total_slots INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY(location_id) REFERENCES parking_locations(id) ON DELETE CASCADE
);

-- 5. Parking Zones Table
CREATE TABLE IF NOT EXISTS parking_zones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    floor_id INTEGER NOT NULL,
    zone_name TEXT NOT NULL,
    zone_type TEXT NOT NULL DEFAULT 'standard' CHECK(zone_type IN ('standard', 'ev_fast', 'disabled', 'vip')),
    FOREIGN KEY(floor_id) REFERENCES parking_floors(id) ON DELETE CASCADE
);

-- 6. Parking Slots Table
CREATE TABLE IF NOT EXISTS parking_slots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    zone_id INTEGER NOT NULL,
    slot_number TEXT NOT NULL,
    slot_type TEXT NOT NULL DEFAULT 'normal' CHECK(slot_type IN ('normal', 'ev', 'disabled', 'vip')),
    status TEXT NOT NULL DEFAULT 'available' CHECK(status IN ('available', 'occupied', 'reserved', 'maintenance', 'disabled')),
    current_booking_id INTEGER,
    sensor_id TEXT,
    last_status_change DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(zone_id) REFERENCES parking_zones(id) ON DELETE CASCADE
);

-- 7. Bookings Table
CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    booking_code TEXT UNIQUE NOT NULL,
    user_id INTEGER NOT NULL,
    slot_id INTEGER NOT NULL,
    vehicle_id INTEGER,
    start_time DATETIME NOT NULL,
    end_time DATETIME NOT NULL,
    duration_hours REAL NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'confirmed', 'active', 'completed', 'cancelled', 'expired', 'refunded')),
    base_charge REAL NOT NULL DEFAULT 0,
    ev_charge REAL NOT NULL DEFAULT 0,
    additional_charge REAL NOT NULL DEFAULT 0,
    discount REAL NOT NULL DEFAULT 0,
    tax REAL NOT NULL DEFAULT 0,
    total_amount REAL NOT NULL DEFAULT 0,
    dynamic_multiplier REAL NOT NULL DEFAULT 1.0,
    qr_token TEXT UNIQUE,
    check_in_time DATETIME,
    check_out_time DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(slot_id) REFERENCES parking_slots(id),
    FOREIGN KEY(vehicle_id) REFERENCES vehicles(id)
);

-- 8. Payments Table
CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    booking_id INTEGER NOT NULL,
    transaction_id TEXT UNIQUE NOT NULL,
    payment_method TEXT NOT NULL CHECK(payment_method IN ('upi', 'card', 'netbanking', 'wallet', 'cash')),
    amount REAL NOT NULL,
    currency TEXT NOT NULL DEFAULT 'INR',
    status TEXT NOT NULL DEFAULT 'completed' CHECK(status IN ('pending', 'processing', 'completed', 'failed', 'refunded')),
    gateway_response TEXT,
    paid_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(booking_id) REFERENCES bookings(id) ON DELETE CASCADE
);

-- 9. Pricing Rules Table
CREATE TABLE IF NOT EXISTS pricing_rules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    location_id INTEGER NOT NULL,
    min_occupancy_pct REAL NOT NULL,
    max_occupancy_pct REAL NOT NULL,
    multiplier REAL NOT NULL,
    peak_start_hour INTEGER,
    peak_end_hour INTEGER,
    is_active INTEGER NOT NULL DEFAULT 1,
    FOREIGN KEY(location_id) REFERENCES parking_locations(id) ON DELETE CASCADE
);

-- 10. EV Chargers Table
CREATE TABLE IF NOT EXISTS ev_chargers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slot_id INTEGER UNIQUE NOT NULL,
    charger_code TEXT UNIQUE NOT NULL,
    charger_type TEXT NOT NULL DEFAULT 'Type 2' CHECK(charger_type IN ('Type 2', 'CCS2', 'CHAdeMO', 'GB/T')),
    power_kw REAL NOT NULL DEFAULT 22.0,
    rate_per_kwh REAL NOT NULL DEFAULT 15.0,
    status TEXT NOT NULL DEFAULT 'available' CHECK(status IN ('available', 'charging', 'reserved', 'offline', 'maintenance')),
    total_energy_delivered_kwh REAL NOT NULL DEFAULT 0.0,
    FOREIGN KEY(slot_id) REFERENCES parking_slots(id) ON DELETE CASCADE
);

-- 11. Charging Sessions Table
CREATE TABLE IF NOT EXISTS charging_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    booking_id INTEGER NOT NULL,
    charger_id INTEGER NOT NULL,
    kwh_consumed REAL NOT NULL DEFAULT 0.0,
    total_cost REAL NOT NULL DEFAULT 0.0,
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'completed', 'stopped')),
    FOREIGN KEY(booking_id) REFERENCES bookings(id),
    FOREIGN KEY(charger_id) REFERENCES ev_chargers(id)
);

-- 12. Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'info' CHECK(type IN ('info', 'success', 'warning', 'danger', 'booking', 'ev', 'price')),
    is_read INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 13. Reviews Table
CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    booking_id INTEGER,
    user_id INTEGER NOT NULL,
    location_id INTEGER NOT NULL,
    rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
    comment TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(location_id) REFERENCES parking_locations(id)
);

-- 14. Fraud Events Table
CREATE TABLE IF NOT EXISTS fraud_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    booking_id INTEGER,
    risk_score INTEGER NOT NULL,
    risk_level TEXT NOT NULL CHECK(risk_level IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    reason TEXT NOT NULL,
    details TEXT,
    is_resolved INTEGER NOT NULL DEFAULT 0,
    detected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(booking_id) REFERENCES bookings(id)
);

-- 15. Occupancy Records Table (Historical Timeseries for ML)
CREATE TABLE IF NOT EXISTS occupancy_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    location_id INTEGER NOT NULL,
    timestamp DATETIME NOT NULL,
    occupied_slots INTEGER NOT NULL,
    total_slots INTEGER NOT NULL,
    occupancy_pct REAL NOT NULL,
    day_of_week INTEGER NOT NULL,
    hour_of_day INTEGER NOT NULL,
    is_weekend INTEGER NOT NULL,
    is_holiday INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY(location_id) REFERENCES parking_locations(id) ON DELETE CASCADE
);

-- 16. Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    action TEXT NOT NULL,
    target_entity TEXT NOT NULL,
    entity_id INTEGER,
    details TEXT,
    ip_address TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
);

-- 17. System Settings Table
CREATE TABLE IF NOT EXISTS system_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indices for high-speed queries
CREATE INDEX IF NOT EXISTS idx_slots_location ON parking_slots(zone_id, status);
CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings(user_id, status);
CREATE INDEX IF NOT EXISTS idx_bookings_slot ON bookings(slot_id, start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_occupancy_loc_time ON occupancy_records(location_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id, created_at);
