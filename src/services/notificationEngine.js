const crypto = require('node:crypto');
const db = require('../database/db');

class NotificationEngine {
    // Send event notification with deduplication
    send({
        recipientUserId = null,
        recipientRole,
        institutionId = null,
        eventType,
        title,
        message,
        channel = 'IN_APP',
        preventDuplicatesToday = true
    }) {
        // Prevent duplicate alerts during repeated scheduler runs within the same calendar day
        if (preventDuplicatesToday) {
            const existing = db.queryOne(`
                SELECT id FROM notifications
                WHERE (recipient_user_id = ? OR (? IS NULL AND recipient_user_id IS NULL))
                AND recipient_role = ?
                AND (institution_id = ? OR (? IS NULL AND institution_id IS NULL))
                AND event_type = ?
                AND title = ?
                AND date(sent_at) = date('now')
                LIMIT 1
            `, [recipientUserId, recipientUserId, recipientRole, institutionId, institutionId, eventType, title]);

            if (existing) {
                return { id: existing.id, status: 'DEDUPLICATED', sentAt: new Date().toISOString() };
            }
        }

        const id = crypto.randomUUID();
        const now = new Date().toISOString();

        // In-app record creation
        db.execute(`
            INSERT INTO notifications (
                id, recipient_user_id, recipient_role, institution_id,
                event_type, title, message, channel, status, retry_count, sent_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'SENT', 0, ?)
        `, [id, recipientUserId, recipientRole, institutionId, eventType, title, message, channel, now]);

        // Simulated external channel delivery adapter (Email / SMS)
        if (channel === 'EMAIL' || channel === 'SMS') {
            this.dispatchExternalAdapter(channel, { title, message, recipientUserId, recipientRole });
        }

        return { id, status: 'SENT', sentAt: now };
    }

    // Explicitly labeled external simulation adapter (no live SMTP / SMS gateway claims)
    dispatchExternalAdapter(channel, payload) {
        console.log(`[SIMULATION: Gateway Not Configured | Channel: ${channel}] To: ${payload.recipientRole} (${payload.recipientUserId || 'Role Broadcast'}) | Subject: ${payload.title}`);
    }

    // Get notifications for user or role
    getUserNotifications(userId, roleCode, limit = 50) {
        return db.query(`
            SELECT * FROM notifications 
            WHERE (recipient_user_id = ? OR recipient_role = ? OR recipient_role = 'ALL')
            ORDER BY sent_at DESC LIMIT ?
        `, [userId, roleCode, limit]);
    }

    // Mark notification as read
    markAsRead(notificationId) {
        const now = new Date().toISOString();
        db.execute(`
            UPDATE notifications 
            SET status = 'READ', read_at = ?
            WHERE id = ?
        `, [now, notificationId]);
        return { success: true };
    }

    // Get unread count
    getUnreadCount(userId, roleCode) {
        return db.queryOne(`
            SELECT COUNT(*) as count FROM notifications
            WHERE (recipient_user_id = ? OR recipient_role = ? OR recipient_role = 'ALL')
            AND status != 'READ'
        `, [userId, roleCode]).count;
    }
}

module.exports = new NotificationEngine();
