const crypto = require('node:crypto');
const db = require('../database/db');
const auditService = require('./auditService');
const notificationEngine = require('./notificationEngine');

class EscalationEngine {
    // Run automated escalation evaluation
    evaluateEscalations() {
        // Find overdue applications that are not on hold
        const overdueApps = db.query(`
            SELECT a.*, i.name as institution_name, i.permanent_id, r.name as region_name,
                   (julianday('now') - julianday(a.processing_due_date)) as days_overdue
            FROM applications a
            JOIN institutions i ON a.institution_id = i.id
            JOIN regions r ON a.assigned_region_id = r.id
            WHERE a.current_stage NOT IN ('APPROVED', 'REJECTED')
            AND a.is_on_hold = 0
            AND datetime(a.processing_due_date) < datetime('now')
        `);

        const rules = db.query('SELECT * FROM escalation_rules WHERE is_active = 1 ORDER BY days_overdue_threshold DESC');
        const triggeredEscalations = [];

        for (const app of overdueApps) {
            const overdueDays = Math.floor(app.days_overdue);

            // Match highest applicable escalation rule
            const matchedRule = rules.find(r => 
                overdueDays >= r.days_overdue_threshold &&
                (!r.stage_name || r.stage_name === app.current_stage) &&
                (!r.region_id || r.region_id === app.assigned_region_id)
            );

            if (matchedRule) {
                // Check if this escalation has already been triggered for this rule and app
                const existing = db.queryOne(`
                    SELECT * FROM escalation_events 
                    WHERE application_id = ? AND escalation_rule_id = ? AND status IN ('TRIGGERED', 'ACKNOWLEDGED')
                `, [app.id, matchedRule.id]);

                if (!existing) {
                    const eventId = crypto.randomUUID();
                    const triggerReason = `Application ${app.application_no} (${app.institution_name}) has breached SLA by ${overdueDays} days in stage ${app.current_stage}.`;

                    db.execute(`
                        INSERT INTO escalation_events (
                            id, application_id, escalation_rule_id, trigger_reason,
                            escalated_to_role, status, triggered_at
                        ) VALUES (?, ?, ?, ?, ?, 'TRIGGERED', CURRENT_TIMESTAMP)
                    `, [eventId, app.id, matchedRule.id, triggerReason, matchedRule.escalate_to_role]);

                    // Dispatch notification
                    notificationEngine.send({
                        recipientRole: matchedRule.escalate_to_role,
                        eventType: 'CASE_ESCALATED',
                        title: `CRITICAL ESCALATION: ${app.application_no} Overdue by ${overdueDays} Days`,
                        message: triggerReason,
                        channel: 'IN_APP'
                    });

                    triggeredEscalations.push({
                        eventId,
                        applicationId: app.id,
                        applicationNo: app.application_no,
                        overdueDays,
                        escalatedToRole: matchedRule.escalate_to_role
                    });
                }
            }
        }

        return triggeredEscalations;
    }

    // Acknowledge Escalation
    acknowledgeEscalation(eventId, user) {
        const ev = db.queryOne('SELECT * FROM escalation_events WHERE id = ?', [eventId]);
        if (!ev) throw new Error('Escalation event not found.');

        const now = new Date().toISOString();
        db.execute(`
            UPDATE escalation_events
            SET status = 'ACKNOWLEDGED', acknowledged_at = ?
            WHERE id = ?
        `, [now, eventId]);

        auditService.log({
            actorId: user.id,
            actorUsername: user.username,
            actorRole: user.role_code,
            actionType: 'ACKNOWLEDGE_ESCALATION',
            entityName: 'escalation_events',
            entityId: eventId,
            previousState: { status: ev.status },
            newState: { status: 'ACKNOWLEDGED', acknowledged_at: now },
            justification: `Officer ${user.full_name} formally acknowledged regulatory escalation.`
        });

        return { eventId, status: 'ACKNOWLEDGED' };
    }

    // Resolve Escalation
    resolveEscalation(eventId, resolutionNotes, user) {
        const ev = db.queryOne('SELECT * FROM escalation_events WHERE id = ?', [eventId]);
        if (!ev) throw new Error('Escalation event not found.');

        const now = new Date().toISOString();
        db.execute(`
            UPDATE escalation_events
            SET status = 'RESOLVED', resolved_at = ?, resolution_notes = ?
            WHERE id = ?
        `, [now, resolutionNotes, eventId]);

        auditService.log({
            actorId: user.id,
            actorUsername: user.username,
            actorRole: user.role_code,
            actionType: 'RESOLVE_ESCALATION',
            entityName: 'escalation_events',
            entityId: eventId,
            previousState: { status: ev.status },
            newState: { status: 'RESOLVED', resolutionNotes },
            justification: `Escalation resolved: ${resolutionNotes}`
        });

        return { eventId, status: 'RESOLVED' };
    }

    // Get Active Escalation Register
    getActiveEscalations() {
        return db.query(`
            SELECT ee.*, a.application_no, a.current_stage, i.name as institution_name,
                   er.rule_name, er.escalation_level, r.name as region_name
            FROM escalation_events ee
            JOIN applications a ON ee.application_id = a.id
            JOIN institutions i ON a.institution_id = i.id
            JOIN regions r ON a.assigned_region_id = r.id
            JOIN escalation_rules er ON ee.escalation_rule_id = er.id
            WHERE ee.status IN ('TRIGGERED', 'ACKNOWLEDGED', 'REASSIGNED')
            ORDER BY ee.triggered_at DESC
        `);
    }
}

module.exports = new EscalationEngine();
