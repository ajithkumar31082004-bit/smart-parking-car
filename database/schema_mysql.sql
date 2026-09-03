-- =======================================================================
-- SmartPark AI — AWS RDS MySQL Production Schema
-- Compatible with MySQL 8.0+ on AWS RDS
-- =======================================================================

CREATE DATABASE IF NOT EXISTS smartpark CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE smartpark;

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    role ENUM('user', 'admin', 'staff', 'manager') DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user_email (email),
    INDEX idx_user_role (role)
) ENGINE=InnoDB;

-- 2. VEHICLES (CUSTOMER GARAGE)
CREATE TABLE IF NOT EXISTS vehicles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    vehicle_number VARCHAR(50) NOT NULL,
    vehicle_type ENUM('car', 'bike', 'truck', 'ev') DEFAULT 'car',
    vehicle_name VARCHAR(100),
    is_ev BOOLEAN DEFAULT FALSE,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY uq_user_vehicle (user_id, vehicle_number)
) ENGINE=InnoDB;

-- 3. PARKING LOCATIONS / HUBS
CREATE TABLE IF NOT EXISTS parking_locations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    address VARCHAR(255) NOT NULL,
    city VARCHAR(100) NOT NULL,
    latitude DECIMAL(10, 7) NOT NULL,
    longitude DECIMAL(10, 7) NOT NULL,
    total_spots INT DEFAULT 0,
    hourly_rate DECIMAL(10, 2) DEFAULT 50.00,
    ev_hourly_rate DECIMAL(10, 2) DEFAULT 80.00,
    valet_available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 4. PARKING FLOORS
CREATE TABLE IF NOT EXISTS parking_floors (
    id INT AUTO_INCREMENT PRIMARY KEY,
    location_id INT NOT NULL,
    floor_number INT NOT NULL,
    floor_name VARCHAR(50) NOT NULL,
    total_slots INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (location_id) REFERENCES parking_locations(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 5. PARKING SLOTS
CREATE TABLE IF NOT EXISTS parking_slots (
    id INT AUTO_INCREMENT PRIMARY KEY,
    location_id INT NOT NULL,
    floor_id INT NOT NULL,
    slot_number VARCHAR(50) NOT NULL,
    floor INT NOT NULL,
    type ENUM('standard', 'compact', 'ev', 'disabled', 'vip') DEFAULT 'standard',
    status ENUM('available', 'occupied', 'reserved', 'maintenance') DEFAULT 'available',
    is_ev_charging BOOLEAN DEFAULT FALSE,
    price DECIMAL(10, 2) DEFAULT 50.00,
    distance_to_lift_meters INT DEFAULT 20,
    sensor_id VARCHAR(100) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (location_id) REFERENCES parking_locations(id) ON DELETE CASCADE,
    FOREIGN KEY (floor_id) REFERENCES parking_floors(id) ON DELETE CASCADE,
    INDEX idx_slot_status (status),
    INDEX idx_slot_location (location_id)
) ENGINE=InnoDB;

-- 6. IOT DEVICES & SENSORS
CREATE TABLE IF NOT EXISTS iot_devices (
    id INT AUTO_INCREMENT PRIMARY KEY,
    device_id VARCHAR(100) UNIQUE NOT NULL,
    slot_id INT NULL,
    device_type ENUM('ultrasonic', 'camera_anpr', 'servo_gate', 'rfid_reader') NOT NULL,
    status ENUM('online', 'offline', 'warning') DEFAULT 'online',
    last_distance_cm INT NULL,
    battery_percentage INT DEFAULT 100,
    firmware_version VARCHAR(50) DEFAULT '1.0.0',
    last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (slot_id) REFERENCES parking_slots(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- 7. SENSOR TELEMETRY LOGS
CREATE TABLE IF NOT EXISTS sensor_telemetry (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    device_id VARCHAR(100) NOT NULL,
    slot_id INT NULL,
    distance_cm INT NOT NULL,
    detected_state ENUM('free', 'occupied', 'transient') NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_telemetry_time (timestamp),
    INDEX idx_telemetry_device (device_id)
) ENGINE=InnoDB;

-- 8. BOOKINGS
CREATE TABLE IF NOT EXISTS bookings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    booking_code VARCHAR(100) UNIQUE NOT NULL,
    user_id INT NOT NULL,
    slot_id INT NOT NULL,
    vehicle_number VARCHAR(50) NOT NULL,
    vehicle_type VARCHAR(50) DEFAULT 'car',
    start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    end_time TIMESTAMP NOT NULL,
    duration_hours DECIMAL(4, 2) NOT NULL,
    base_amount DECIMAL(10, 2) NOT NULL,
    dynamic_surge_multiplier DECIMAL(4, 2) DEFAULT 1.0,
    ev_charging_fee DECIMAL(10, 2) DEFAULT 0.0,
    discount_amount DECIMAL(10, 2) DEFAULT 0.0,
    total_amount DECIMAL(10, 2) NOT NULL,
    status ENUM('pending', 'confirmed', 'checked_in', 'completed', 'cancelled') DEFAULT 'pending',
    check_in_time TIMESTAMP NULL,
    check_out_time TIMESTAMP NULL,
    qr_token VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (slot_id) REFERENCES parking_slots(id) ON DELETE CASCADE,
    INDEX idx_booking_status (status),
    INDEX idx_booking_code (booking_code)
) ENGINE=InnoDB;

-- 9. PAYMENTS
CREATE TABLE IF NOT EXISTS payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    booking_id INT NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    payment_method ENUM('card', 'upi', 'netbanking', 'wallet', 'crypto') DEFAULT 'upi',
    status ENUM('pending', 'completed', 'failed', 'refunded') DEFAULT 'pending',
    transaction_id VARCHAR(100) UNIQUE NOT NULL,
    payment_gateway_ref VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 10. PARKING HISTORY (ANALYTICS & AUDIT)
CREATE TABLE IF NOT EXISTS parking_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    slot_id INT NOT NULL,
    booking_id INT NULL,
    vehicle_number VARCHAR(50) NOT NULL,
    entry_time TIMESTAMP NOT NULL,
    exit_time TIMESTAMP NOT NULL,
    duration_minutes INT NOT NULL,
    final_fee DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (slot_id) REFERENCES parking_slots(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 11. FRAUD & ANOMALY DETECTION LOGS
CREATE TABLE IF NOT EXISTS fraud_events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    booking_id INT NULL,
    event_type VARCHAR(100) NOT NULL,
    risk_score DECIMAL(4, 2) NOT NULL,
    severity ENUM('low', 'medium', 'high', 'critical') DEFAULT 'low',
    details JSON NULL,
    is_resolved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 12. NOTIFICATIONS
CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type ENUM('booking', 'payment', 'gate', 'alert', 'system') DEFAULT 'booking',
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 13. REVIEWS & RATINGS
CREATE TABLE IF NOT EXISTS reviews (
    id INT AUTO_INCREMENT PRIMARY KEY,
    booking_id INT NOT NULL,
    user_id INT NOT NULL,
    location_id INT NULL,
    rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;
