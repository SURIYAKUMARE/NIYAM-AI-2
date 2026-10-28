const notificationEngine = require('../services/notificationEngine');

class NotificationController {
    getUserNotifications(req, res) {
        try {
            const user = req.user;
            const notifs = notificationEngine.getUserNotifications(user.id, user.role_code);
            const unreadCount = notificationEngine.getUnreadCount(user.id, user.role_code);
            return res.json({ notifications: notifs, unreadCount });
        } catch (err) {
            return res.status(500).json({ error: err.message });
        }
    }

    markAsRead(req, res) {
        try {
            const { id } = req.params;
            const result = notificationEngine.markAsRead(id);
            return res.json(result);
        } catch (err) {
            return res.status(500).json({ error: err.message });
        }
    }
}

module.exports = new NotificationController();
