const db = require('../database/db');
const escalationEngine = require('./escalationEngine');
const documentService = require('./documentService');
const notificationEngine = require('./notificationEngine');

class SchedulerService {
    constructor() {
        this.intervalHandle = null;
    }

    // Run a full scheduled evaluation cycle
    runCycle() {
        const results = {
            timestamp: new Date().toISOString(),
            escalationsTriggered: 0,
            expiryAlertsTriggered: 0,
            undertakingsUpdated: 0
        };

        try {
            // 1. Evaluate application overdue escalations
            const escalations = escalationEngine.evaluateEscalations();
            results.escalationsTriggered = escalations.length;

            // 2. Evaluate document expiry reminders
            const expiryAlerts = documentService.evaluateExpiryAlerts();
            for (const alert of expiryAlerts) {
                // Send alert
                notificationEngine.send({
                    institutionId: alert.document.institution_id,
                    recipientRole: 'INSTITUTION_REP',
                    eventType: alert.eventType,
                    title: `Document Expiry Notice: ${alert.document.document_title}`,
                    message: `Document '${alert.document.document_title}' for institution '${alert.document.institution_name}' is expiring in ${alert.daysRemaining} days (Expiry: ${alert.document.expiry_date}). Please submit renewal deed immediately.`,
                    channel: 'IN_APP'
                });
            }
            results.expiryAlertsTriggered = expiryAlerts.length;

            // 3. Mark undertakings that passed due date as OVERDUE
            const overdueUndertakings = db.query(`
                SELECT id, undertaking_ref, institution_id FROM undertakings
                WHERE status IN ('PENDING', 'UPCOMING') AND date(due_date) < date('now')
            `);

            for (const u of overdueUndertakings) {
                db.execute(`UPDATE undertakings SET status = 'OVERDUE' WHERE id = ?`, [u.id]);
                notificationEngine.send({
                    institutionId: u.institution_id,
                    recipientRole: 'INSTITUTION_REP',
                    eventType: 'UNDERTAKING_OVERDUE',
                    title: `Compliance Undertaking Overdue: ${u.undertaking_ref}`,
                    message: `Undertaking obligation ${u.undertaking_ref} has exceeded statutory deadline. Case flagged for regulatory compliance action.`,
                    channel: 'IN_APP'
                });
            }
            results.undertakingsUpdated = overdueUndertakings.length;

            return results;
        } catch (err) {
            console.error('[Scheduler Cycle Error]', err);
            results.error = err.message;
            return results;
        }
    }

    start(intervalMs = 60000) {
        if (!this.intervalHandle) {
            this.runCycle();
            this.intervalHandle = setInterval(() => this.runCycle(), intervalMs);
        }
    }

    stop() {
        if (this.intervalHandle) {
            clearInterval(this.intervalHandle);
            this.intervalHandle = null;
        }
    }
}

module.exports = new SchedulerService();
