-- ==========================================================
-- SmartPark AI - PostgreSQL / Supabase Schema
-- Run this file in Supabase → SQL Editor
-- ==========================================================

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id          BIGSERIAL PRIMARY KEY,
    name        TEXT NOT NULL,
    email       TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role        TEXT NOT NULL DEFAULT 'customer'
                    CHECK (role IN ('customer', 'staff', 'manager', 'admin', 'superadmin')),
    phone       TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Vehicles Table
CREATE TABLE IF NOT EXISTS vehicles (
    id             BIGSERIAL PRIMARY KEY,
    user_id        BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    vehicle_number TEXT UNIQUE NOT NULL,
    vehicle_type   TEXT NOT NULL DEFAULT 'car'
                       CHECK (vehicle_type IN ('car', 'suv', 'bike', 'van', 'ev')),
    brand          TEXT,
    model          TEXT,
    color          TEXT,
    fuel_type      TEXT DEFAULT 'petrol',
    is_ev          BOOLEAN NOT NULL DEFAULT FALSE,
    is_default     BOOLEAN NOT NULL DEFAULT FALSE,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Parking Locations Table
CREATE TABLE IF NOT EXISTS parking_locations (
    id                   BIGSERIAL PRIMARY KEY,
    name                 TEXT NOT NULL,
    address              TEXT NOT NULL,
    city                 TEXT NOT NULL,
    latitude             DOUBLE PRECISION NOT NULL,
    longitude            DOUBLE PRECISION NOT NULL,
    base_hourly_rate     NUMERIC(10, 2) NOT NULL DEFAULT 40.00,
    total_slots          INTEGER NOT NULL DEFAULT 0,
    available_slots      INTEGER NOT NULL DEFAULT 0,
    rating               NUMERIC(3, 2) NOT NULL DEFAULT 4.80,
    review_count         INTEGER NOT NULL DEFAULT 0,
    has_ev_charging      BOOLEAN NOT NULL DEFAULT TRUE,
    has_covered_parking  BOOLEAN NOT NULL DEFAULT TRUE,
    has_cctv             BOOLEAN NOT NULL DEFAULT TRUE,
    is_24_7              BOOLEAN NOT NULL DEFAULT TRUE,
    is_active            BOOLEAN NOT NULL DEFAULT TRUE,
    image_url            TEXT,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Parking Floors Table
CREATE TABLE IF NOT EXISTS parking_floors (
    id           BIGSERIAL PRIMARY KEY,
    location_id  BIGINT NOT NULL REFERENCES parking_locations(id) ON DELETE CASCADE,
    floor_number INTEGER NOT NULL,
    floor_name   TEXT NOT NULL,
    total_slots  INTEGER NOT NULL DEFAULT 0
);

-- 5. Parking Zones Table
CREATE TABLE IF NOT EXISTS parking_zones (
    id        BIGSERIAL PRIMARY KEY,
    floor_id  BIGINT NOT NULL REFERENCES parking_floors(id) ON DELETE CASCADE,
    zone_name TEXT NOT NULL,
    zone_type TEXT NOT NULL DEFAULT 'standard'
                  CHECK (zone_type IN ('standard', 'ev_fast', 'disabled', 'vip'))
);

-- 6. Parking Slots Table
CREATE TABLE IF NOT EXISTS parking_slots (
    id                 BIGSERIAL PRIMARY KEY,
    zone_id            BIGINT NOT NULL REFERENCES parking_zones(id) ON DELETE CASCADE,
    slot_number        TEXT NOT NULL,
    slot_type          TEXT NOT NULL DEFAULT 'normal'
                           CHECK (slot_type IN ('normal', 'ev', 'disabled', 'vip')),
    status             TEXT NOT NULL DEFAULT 'available'
                           CHECK (status IN ('available', 'occupied', 'reserved', 'maintenance', 'disabled')),
    current_booking_id BIGINT,   -- FK added after bookings table
    sensor_id          TEXT,
    last_status_change TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Bookings Table
CREATE TABLE IF NOT EXISTS bookings (
    id                 BIGSERIAL PRIMARY KEY,
    booking_code       TEXT UNIQUE NOT NULL,
    user_id            BIGINT NOT NULL REFERENCES users(id),
    slot_id            BIGINT NOT NULL REFERENCES parking_slots(id),
    vehicle_id         BIGINT REFERENCES vehicles(id),
    start_time         TIMESTAMPTZ NOT NULL,
    end_time           TIMESTAMPTZ NOT NULL,
    duration_hours     NUMERIC(8, 2) NOT NULL,
    status             TEXT NOT NULL DEFAULT 'pending'
                           CHECK (status IN ('pending', 'confirmed', 'active', 'completed', 'cancelled', 'expired', 'refunded')),
    base_charge        NUMERIC(10, 2) NOT NULL DEFAULT 0,
    ev_charge          NUMERIC(10, 2) NOT NULL DEFAULT 0,
    additional_charge  NUMERIC(10, 2) NOT NULL DEFAULT 0,
    discount           NUMERIC(10, 2) NOT NULL DEFAULT 0,
    tax                NUMERIC(10, 2) NOT NULL DEFAULT 0,
    total_amount       NUMERIC(10, 2) NOT NULL DEFAULT 0,
    dynamic_multiplier NUMERIC(5, 3) NOT NULL DEFAULT 1.000,
    qr_token           TEXT UNIQUE,
    check_in_time      TIMESTAMPTZ,
    check_out_time     TIMESTAMPTZ,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add deferred FK from parking_slots.current_booking_id → bookings(id)
ALTER TABLE parking_slots
    ADD CONSTRAINT fk_current_booking
    FOREIGN KEY (current_booking_id) REFERENCES bookings(id) ON DELETE SET NULL;

-- 8. Payments Table
CREATE TABLE IF NOT EXISTS payments (
    id              BIGSERIAL PRIMARY KEY,
    booking_id      BIGINT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    transaction_id  TEXT UNIQUE NOT NULL,
    payment_method  TEXT NOT NULL
                        CHECK (payment_method IN ('upi', 'card', 'netbanking', 'wallet', 'cash')),
    amount          NUMERIC(10, 2) NOT NULL,
    currency        TEXT NOT NULL DEFAULT 'INR',
    status          TEXT NOT NULL DEFAULT 'completed'
                        CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'refunded')),
    gateway_response TEXT,
    paid_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. Pricing Rules Table
CREATE TABLE IF NOT EXISTS pricing_rules (
    id                BIGSERIAL PRIMARY KEY,
    location_id       BIGINT NOT NULL REFERENCES parking_locations(id) ON DELETE CASCADE,
    min_occupancy_pct NUMERIC(5, 2) NOT NULL,
    max_occupancy_pct NUMERIC(5, 2) NOT NULL,
    multiplier        NUMERIC(5, 3) NOT NULL,
    peak_start_hour   INTEGER,
    peak_end_hour     INTEGER,
    is_active         BOOLEAN NOT NULL DEFAULT TRUE
);

-- 10. EV Chargers Table
CREATE TABLE IF NOT EXISTS ev_chargers (
    id                        BIGSERIAL PRIMARY KEY,
    slot_id                   BIGINT UNIQUE NOT NULL REFERENCES parking_slots(id) ON DELETE CASCADE,
    charger_code              TEXT UNIQUE NOT NULL,
    charger_type              TEXT NOT NULL DEFAULT 'Type 2'
                                  CHECK (charger_type IN ('Type 2', 'CCS2', 'CHAdeMO', 'GB/T')),
    power_kw                  NUMERIC(8, 2) NOT NULL DEFAULT 22.00,
    rate_per_kwh              NUMERIC(8, 2) NOT NULL DEFAULT 15.00,
    status                    TEXT NOT NULL DEFAULT 'available'
                                  CHECK (status IN ('available', 'charging', 'reserved', 'offline', 'maintenance')),
    total_energy_delivered_kwh NUMERIC(12, 3) NOT NULL DEFAULT 0.000
);

-- 11. Charging Sessions Table
CREATE TABLE IF NOT EXISTS charging_sessions (
    id           BIGSERIAL PRIMARY KEY,
    booking_id   BIGINT NOT NULL REFERENCES bookings(id),
    charger_id   BIGINT NOT NULL REFERENCES ev_chargers(id),
    kwh_consumed NUMERIC(10, 3) NOT NULL DEFAULT 0.000,
    total_cost   NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    started_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    status       TEXT NOT NULL DEFAULT 'active'
                     CHECK (status IN ('active', 'completed', 'stopped'))
);

-- 12. Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
    id         BIGSERIAL PRIMARY KEY,
    user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title      TEXT NOT NULL,
    message    TEXT NOT NULL,
    type       TEXT NOT NULL DEFAULT 'info'
                   CHECK (type IN ('info', 'success', 'warning', 'danger', 'booking', 'ev', 'price')),
    is_read    BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 13. Reviews Table
CREATE TABLE IF NOT EXISTS reviews (
    id          BIGSERIAL PRIMARY KEY,
    booking_id  BIGINT REFERENCES bookings(id),
    user_id     BIGINT NOT NULL REFERENCES users(id),
    location_id BIGINT NOT NULL REFERENCES parking_locations(id),
    rating      INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment     TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 14. Fraud Events Table
CREATE TABLE IF NOT EXISTS fraud_events (
    id          BIGSERIAL PRIMARY KEY,
    user_id     BIGINT REFERENCES users(id),
    booking_id  BIGINT REFERENCES bookings(id),
    risk_score  INTEGER NOT NULL,
    risk_level  TEXT NOT NULL CHECK (risk_level IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    reason      TEXT NOT NULL,
    details     TEXT,
    is_resolved BOOLEAN NOT NULL DEFAULT FALSE,
    detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 15. Occupancy Records Table (Historical Timeseries for ML)
CREATE TABLE IF NOT EXISTS occupancy_records (
    id             BIGSERIAL PRIMARY KEY,
    location_id    BIGINT NOT NULL REFERENCES parking_locations(id) ON DELETE CASCADE,
    timestamp      TIMESTAMPTZ NOT NULL,
    occupied_slots INTEGER NOT NULL,
    total_slots    INTEGER NOT NULL,
    occupancy_pct  NUMERIC(5, 2) NOT NULL,
    day_of_week    INTEGER NOT NULL,
    hour_of_day    INTEGER NOT NULL,
    is_weekend     BOOLEAN NOT NULL,
    is_holiday     BOOLEAN NOT NULL DEFAULT FALSE
);

-- 16. Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
    id            BIGSERIAL PRIMARY KEY,
    user_id       BIGINT REFERENCES users(id),
    action        TEXT NOT NULL,
    target_entity TEXT NOT NULL,
    entity_id     BIGINT,
    details       TEXT,
    ip_address    TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 17. System Settings Table
CREATE TABLE IF NOT EXISTS system_settings (
    key         TEXT PRIMARY KEY,
    value       TEXT NOT NULL,
    description TEXT,
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==========================================================
-- Indexes for high-speed queries
-- ==========================================================
CREATE INDEX IF NOT EXISTS idx_slots_zone_status     ON parking_slots(zone_id, status);
CREATE INDEX IF NOT EXISTS idx_bookings_user_status  ON bookings(user_id, status);
CREATE INDEX IF NOT EXISTS idx_bookings_slot_time    ON bookings(slot_id, start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_occupancy_loc_time    ON occupancy_records(location_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_user_time       ON audit_logs(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_user    ON notifications(user_id, is_read, created_at);
CREATE INDEX IF NOT EXISTS idx_fraud_risk_level      ON fraud_events(risk_level, is_resolved, detected_at);
