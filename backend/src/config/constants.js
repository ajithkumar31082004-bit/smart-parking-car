require('dotenv').config();

// --- Startup security guard ---
const _jwtSecret = process.env.JWT_SECRET;
if (!_jwtSecret || _jwtSecret.trim().length < 32) {
    console.error('\n🚨 FATAL: JWT_SECRET is missing or too short (min 32 chars).');
    console.error('   Generate one with: node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"');
    console.error('   Then add it to your .env file.\n');
    process.exit(1);
}

module.exports = {
    PORT: process.env.PORT || 5000,
    JWT_SECRET: _jwtSecret,
    JWT_EXPIRES_IN: '7d',
    ROLES: {
        CUSTOMER: 'customer',
        STAFF: 'staff',
        MANAGER: 'manager',
        ADMIN: 'admin',
        SUPERADMIN: 'superadmin'
    },
    BOOKING_STATUS: {
        PENDING: 'pending',
        CONFIRMED: 'confirmed',
        ACTIVE: 'active',
        COMPLETED: 'completed',
        CANCELLED: 'cancelled',
        EXPIRED: 'expired',
        REFUNDED: 'refunded'
    },
    SLOT_STATUS: {
        AVAILABLE: 'available',
        OCCUPIED: 'occupied',
        RESERVED: 'reserved',
        MAINTENANCE: 'maintenance',
        DISABLED: 'disabled'
    },
    TAX_RATE: 0.18, // 18% GST
    EV_DEFAULT_KWH_RATE: 15.0 // INR per kWh
};
