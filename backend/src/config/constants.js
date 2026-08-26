require('dotenv').config();

module.exports = {
    PORT: process.env.PORT || 5000,
    JWT_SECRET: process.env.JWT_SECRET || 'smartpark_ai_super_secret_jwt_key_2026',
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
