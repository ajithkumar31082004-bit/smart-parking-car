const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/constants');
const { get } = require('../../../database/db');

// Verify Bearer Token
const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ success: false, error: 'Authentication required. Please provide a valid token.' });
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);

        const user = await get('SELECT id, name, email, role, phone FROM users WHERE id = ?', [decoded.id]);
        if (!user) {
            return res.status(401).json({ success: false, error: 'User session no longer valid.' });
        }

        req.user = user;
        next();
    } catch (err) {
        return res.status(401).json({ success: false, error: 'Invalid or expired token.', details: err.message });
    }
};

// Optional auth for public routes that offer personalized experience if logged in
const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            const decoded = jwt.verify(token, JWT_SECRET);
            const user = await get('SELECT id, name, email, role, phone FROM users WHERE id = ?', [decoded.id]);
            if (user) req.user = user;
        }
    } catch (e) {
        // Continue unauthenticated
    }
    next();
};

// Role-based Access Control Middleware
const authorize = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ success: false, error: 'Unauthorized. Login required.' });
        }

        // Superadmin bypasses role requirements
        if (req.user.role === 'superadmin' || allowedRoles.includes(req.user.role)) {
            return next();
        }

        return res.status(403).json({
            success: false,
            error: `Forbidden: User role '${req.user.role}' lacks permissions for this resource.`
        });
    };
};

module.exports = {
    authenticate,
    optionalAuth,
    authorize
};
