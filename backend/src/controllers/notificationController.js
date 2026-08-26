const { query, run } = require('../../../database/db');

// Get user notifications
exports.getMyNotifications = async (req, res, next) => {
    try {
        const notifications = await query(`
            SELECT * FROM notifications 
            WHERE user_id = ? 
            ORDER BY created_at DESC LIMIT 30
        `, [req.user.id]);

        res.json({
            success: true,
            count: notifications.length,
            notifications
        });
    } catch (err) {
        next(err);
    }
};

// Mark notification as read
exports.markAsRead = async (req, res, next) => {
    try {
        const { id } = req.params;
        await run(`UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?`, [id, req.user.id]);
        res.json({ success: true, message: 'Notification marked as read.' });
    } catch (err) {
        next(err);
    }
};
