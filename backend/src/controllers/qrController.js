const { verifyAndProcessQR } = require('../services/qrService');

// Verify QR Pass data
exports.verifyQR = async (req, res, next) => {
    try {
        const { code } = req.body;
        if (!code) {
            return res.status(400).json({ success: false, error: 'QR Code / Token is required.' });
        }

        const result = await verifyAndProcessQR(code, req.user ? req.user.id : 1, 'check-in');
        if (!result.success) {
            return res.status(400).json(result);
        }

        res.json(result);
    } catch (err) {
        next(err);
    }
};

// Staff Check-In
exports.staffCheckIn = async (req, res, next) => {
    try {
        const { code } = req.body;
        const staffId = req.user.id;

        if (!code) {
            return res.status(400).json({ success: false, error: 'Pass Token or Booking Code is required.' });
        }

        const result = await verifyAndProcessQR(code, staffId, 'check-in');
        if (!result.success) {
            return res.status(400).json(result);
        }

        res.json(result);
    } catch (err) {
        next(err);
    }
};

// Staff Check-Out
exports.staffCheckOut = async (req, res, next) => {
    try {
        const { code } = req.body;
        const staffId = req.user.id;

        if (!code) {
            return res.status(400).json({ success: false, error: 'Pass Token or Booking Code is required.' });
        }

        const result = await verifyAndProcessQR(code, staffId, 'check-out');
        if (!result.success) {
            return res.status(400).json(result);
        }

        res.json(result);
    } catch (err) {
        next(err);
    }
};
