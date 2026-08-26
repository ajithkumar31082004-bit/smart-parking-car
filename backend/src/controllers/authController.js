const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { JWT_SECRET, JWT_EXPIRES_IN } = require('../config/constants');
const { get, run } = require('../../../database/db');

// Register a new customer
exports.register = async (req, res, next) => {
    try {
        const { name, email, password, phone, vehicleNumber, vehicleType, isEv } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ success: false, error: 'Name, email, and password are required.' });
        }

        // Check if email already exists
        const existing = await get('SELECT id FROM users WHERE email = ?', [email.toLowerCase().trim()]);
        if (existing) {
            return res.status(400).json({ success: false, error: 'An account with this email already exists.' });
        }

        const passwordHash = await bcrypt.hash(password, 10);
        const userRes = await run(
            `INSERT INTO users (name, email, password_hash, role, phone) VALUES (?, ?, ?, 'customer', ?)`,
            [name.trim(), email.toLowerCase().trim(), passwordHash, phone || null]
        );
        const userId = userRes.lastID;

        // Optionally register initial vehicle
        if (vehicleNumber) {
            await run(
                `INSERT INTO vehicles (user_id, vehicle_number, vehicle_type, is_ev, is_default)
                 VALUES (?, ?, ?, ?, 1)`,
                [userId, vehicleNumber.toUpperCase().trim(), vehicleType || 'car', isEv ? 1 : 0]
            );
        }

        // Welcome notification
        await run(
            `INSERT INTO notifications (user_id, title, message, type)
             VALUES (?, 'Welcome to SmartPark AI', 'Your smart parking account is ready. Search for spots, reserve slots, and enjoy fast QR entry.', 'info')`,
            [userId]
        );

        // Generate JWT
        const token = jwt.sign({ id: userId, email, role: 'customer' }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

        res.status(201).json({
            success: true,
            message: 'Registration successful',
            token,
            user: {
                id: userId,
                name: name.trim(),
                email: email.toLowerCase().trim(),
                role: 'customer',
                phone: phone || null
            }
        });
    } catch (err) {
        next(err);
    }
};

// Login user
exports.login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, error: 'Email and password are required.' });
        }

        const user = await get('SELECT * FROM users WHERE email = ?', [email.toLowerCase().trim()]);
        if (!user) {
            return res.status(401).json({ success: false, error: 'Invalid email or password.' });
        }

        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ success: false, error: 'Invalid email or password.' });
        }

        // Generate JWT
        const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

        res.json({
            success: true,
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                phone: user.phone
            }
        });
    } catch (err) {
        next(err);
    }
};

// Get current profile
exports.getMe = async (req, res, next) => {
    try {
        const user = await get('SELECT id, name, email, role, phone, created_at FROM users WHERE id = ?', [req.user.id]);
        const vehicles = await query('SELECT * FROM vehicles WHERE user_id = ?', [req.user.id]);

        res.json({
            success: true,
            user: {
                ...user,
                vehicles
            }
        });
    } catch (err) {
        next(err);
    }
};
