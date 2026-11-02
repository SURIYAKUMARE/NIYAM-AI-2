const crypto = require('node:crypto');
const db = require('../database/db');
const auditService = require('./auditService');
const notificationEngine = require('./notificationEngine');

/**
 * 4-LEVEL HIERARCHICAL INTELLIGENT ESCALATION ENGINE
 * 
 * Levels:
 * - Level 1: Assigned Officer (Overdue >= 1 day)
 * - Level 2: Regional Officer (Overdue >= 3 days)
 * - Level 3: Regional Director / Bureau Officer (Overdue >= 7 days)
 * - Level 4: Central Authority / AICTE Chairman (Overdue >= 14 days)
 */
class EscalationEngine {
    constructor() {
        this.HIERARCHY_LEVELS = [
            {
                level: 1,
                role: 'SCRUTINY_MEMBER',
                roleTitle: 'Assigned Scrutiny / EVC Officer',
                thresholdDays: 1,
                severity: 'NOTICE'
            },
            {
                level: 2,
                role: 'REGIONAL_OFFICER',
                roleTitle: 'Regional Jurisdictional Officer',
                thresholdDays: 3,
                severity: 'WARNING'
            },
            {
                level: 3,
                role: 'REGULATION_BUREAU_ADMIN',
                roleTitle: 'Regional Director / Regulation Bureau Head',
                thresholdDays: 7,
                severity: 'CRITICAL'
            },
            {
                level: 4,
                role: 'COMPETENT_AUTHORITY',
                roleTitle: 'Central Authority (Member Secretary / Council Executive)',
                thresholdDays: 14,
                severity: 'EMERGENCY_INTERVENTION'
            }
        ];
    }

    /**
     * Evaluate overdue applications against 4-tier escalation hierarchy
     */
    evaluateEscalations() {
        // Find overdue applications not on hold and not approved/rejected
        const overdueApps = db.query(`
            SELECT a.*, i.name as institution_name, i.permanent_id, r.name as region_name, r.code as region_code,
                   (julianday('now') - julianday(a.processing_due_date)) as days_overdue
            FROM applications a
            JOIN institutions i ON a.institution_id = i.id
            JOIN regions r ON a.assigned_region_id = r.id
            WHERE a.current_stage NOT IN ('APPROVED', 'REJECTED')
            AND a.is_on_hold = 0
            AND datetime(a.processing_due_date) < datetime('now')
        `);

        const triggeredEscalations = [];

        for (const app of overdueApps) {
            const overdueDays = Math.max(1, Math.floor(app.days_overdue));

            // Determine highest applicable level based on overdue days
            let targetLevel = 1;
            for (const h of this.HIERARCHY_LEVELS) {
                if (overdueDays >= h.thresholdDays) {
                    targetLevel = h.level;
                }
            }

            const levelConfig = this.HIERARCHY_LEVELS.find(h => h.level === targetLevel);

            // Check if active escalation already triggered at this or higher level
            const existing = db.queryOne(`
                SELECT * FROM escalation_events 
                WHERE application_id = ? 
                AND status IN ('TRIGGERED', 'ACKNOWLEDGED')
                ORDER BY escalation_level DESC LIMIT 1
            `, [app.id]);

            if (!existing || existing.escalation_level < targetLevel) {
                const eventId = crypto.randomUUID();
                const triggerReason = `Application ${app.application_no} (${app.institution_name}) has breached statutory SLA by ${overdueDays} days in stage ${app.current_stage}. Escalated to Level ${targetLevel} (${levelConfig.roleTitle}).`;

                // Retrieve fallback or seed rule ID
                const defaultRule = db.queryOne('SELECT id FROM escalation_rules LIMIT 1');
                const ruleId = defaultRule ? defaultRule.id : 'DEFAULT_ESCALATION_RULE';

                db.execute(`
                    INSERT INTO escalation_events (
                        id, application_id, escalation_rule_id, trigger_reason,
                        escalated_to_role, status, escalation_level, triggered_at
                    ) VALUES (?, ?, ?, ?, ?, 'TRIGGERED', ?, CURRENT_TIMESTAMP)
                `, [eventId, app.id, ruleId, triggerReason, levelConfig.role, targetLevel]);

                // Update application current escalation level
                db.execute(`
                    UPDATE applications
                    SET current_escalation_level = ?
                    WHERE id = ?
                `, [targetLevel, app.id]);

                // Dispatch multi-channel notification
                notificationEngine.send({
                    recipientRole: levelConfig.role,
                    eventType: 'CASE_ESCALATED',
                    title: `LEVEL ${targetLevel} ESCALATION: ${app.application_no} Overdue by ${overdueDays} Days`,
                    message: triggerReason,
                    channel: targetLevel >= 3 ? 'EMAIL' : 'IN_APP',
                    institutionId: app.institution_id
                });

                // For Level 4, also broadcast SMS alert simulation
                if (targetLevel === 4) {
                    notificationEngine.send({
                        recipientRole: 'COMPETENT_AUTHORITY',
                        eventType: 'EMERGENCY_INTERVENTION',
                        title: `EMERGENCY SLA BREACH: ${app.application_no}`,
                        message: `Critical regulatory breach (${overdueDays}d) on docket ${app.application_no}. Central Authority docket review mandated under APH Rule 11.2.`,
                        channel: 'SMS',
                        institutionId: app.institution_id
                    });
                }

                triggeredEscalations.push({
                    eventId,
                    applicationId: app.id,
                    applicationNo: app.application_no,
                    institutionName: app.institution_name,
                    overdueDays,
                    escalationLevel: targetLevel,
                    escalatedToRole: levelConfig.role,
                    roleTitle: levelConfig.roleTitle,
                    severity: levelConfig.severity
                });
            }
        }

        return triggeredEscalations;
    }

    /**
     * Acknowledge Escalation
     */
    acknowledgeEscalation(eventId, user) {
        const ev = db.queryOne('SELECT * FROM escalation_events WHERE id = ?', [eventId]);
        if (!ev) throw new Error('Escalation event not found.');

        const now = new Date().toISOString();
        db.execute(`
            UPDATE escalation_events
            SET status = 'ACKNOWLEDGED', acknowledged_at = ?, escalated_to_user_id = ?
            WHERE id = ?
        `, [now, user.id, eventId]);

        auditService.log({
            actorId: user.id,
            actorUsername: user.username,
            actorRole: user.role_code,
            actionType: 'ACKNOWLEDGE_ESCALATION',
            entityName: 'escalation_events',
            entityId: eventId,
            previousState: { status: ev.status },
            newState: { status: 'ACKNOWLEDGED', acknowledged_at: now, acknowledged_by: user.id },
            justification: `Officer ${user.full_name} (${user.role_code}) formally acknowledged Level ${ev.escalation_level || 1} escalation notice.`
        });

        return { eventId, status: 'ACKNOWLEDGED', acknowledgedAt: now };
    }

    /**
     * Formally Resolve Escalation with Officer Resolution Notes
     */
    resolveEscalation(eventId, user, resolutionNotes) {
        if (!resolutionNotes || resolutionNotes.trim().length < 5) {
            throw new Error('Mandatory resolution notes (min 5 chars) required to close regulatory escalation.');
        }

        const ev = db.queryOne('SELECT * FROM escalation_events WHERE id = ?', [eventId]);
        if (!ev) throw new Error('Escalation event not found.');

        const now = new Date().toISOString();
        db.execute(`
            UPDATE escalation_events
            SET status = 'RESOLVED', resolved_at = ?, resolution_notes = ?, escalated_to_user_id = ?
            WHERE id = ?
        `, [now, resolutionNotes, user.id, eventId]);

        // Reset application escalation level if all active resolved
        const remainingActive = db.queryOne(`
            SELECT COUNT(*) as cnt FROM escalation_events 
            WHERE application_id = ? AND status IN ('TRIGGERED', 'ACKNOWLEDGED')
        `, [ev.application_id]);

        if (!remainingActive || remainingActive.cnt === 0) {
            db.execute('UPDATE applications SET current_escalation_level = 1 WHERE id = ?', [ev.application_id]);
        }

        auditService.log({
            actorId: user.id,
            actorUsername: user.username,
            actorRole: user.role_code,
            actionType: 'RESOLVE_ESCALATION',
            entityName: 'escalation_events',
            entityId: eventId,
            previousState: { status: ev.status },
            newState: { status: 'RESOLVED', resolved_at: now, notes: resolutionNotes },
            justification: `Escalation resolved by ${user.full_name}: ${resolutionNotes}`
        });

        return { eventId, status: 'RESOLVED', resolvedAt: now, resolutionNotes };
    }

    /**
     * Administrative Override with Mandatory Justification
     */
    administrativeOverride({ eventId, applicationId, user, reason, extensionDays = 7 }) {
        if (!['SUPER_ADMIN', 'REGULATION_BUREAU_ADMIN', 'COMPETENT_AUTHORITY'].includes(user.role_code)) {
            throw new Error(`Role '${user.role_code}' is not authorized to execute statutory administrative overrides.`);
        }
        if (!reason || reason.trim().length < 10) {
            throw new Error('Mandatory statutory justification (min 10 chars) required for administrative override.');
        }

        return db.transaction((tx) => {
            const app = tx.queryOne('SELECT * FROM applications WHERE id = ?', [applicationId]);
            if (!app) throw new Error('Application not found.');

            const now = new Date().toISOString();
            const newDueDate = new Date();
            newDueDate.setDate(newDueDate.getDate() + extensionDays);

            // 1. Update application due date and reset level
            tx.execute(`
                UPDATE applications
                SET processing_due_date = ?, current_escalation_level = 1, updated_at = ?
                WHERE id = ?
            `, [newDueDate.toISOString(), now, applicationId]);

            // 2. Mark escalation event as overridden / resolved
            if (eventId) {
                tx.execute(`
                    UPDATE escalation_events
                    SET status = 'RESOLVED', administrative_override = 1,
                        override_justification = ?, override_actor_id = ?,
                        resolved_at = ?, resolution_notes = ?
                    WHERE id = ?
                `, [reason, user.id, now, `Administrative Override: ${reason} (Extended +${extensionDays}d)`, eventId]);
            }

            // 3. Log cryptographic audit trail
            auditService.log({
                actorId: user.id,
                actorUsername: user.username,
                actorRole: user.role_code,
                actionType: 'ADMINISTRATIVE_OVERRIDE',
                entityName: 'applications',
                entityId: applicationId,
                previousState: { processing_due_date: app.processing_due_date, escalation_level: app.current_escalation_level },
                newState: { processing_due_date: newDueDate.toISOString(), escalation_level: 1, override_by: user.id },
                justification: `STATUTORY OVERRIDE: ${reason} | Granted +${extensionDays} days extension until ${newDueDate.toISOString().slice(0, 10)}.`
            });

            return {
                applicationId,
                newDueDate: newDueDate.toISOString(),
                overrideGranted: true,
                grantedBy: user.full_name
            };
        });
    }

    /**
     * Get active escalations
     */
    getActiveEscalations() {
        return db.query(`
            SELECT e.*, a.application_no, a.current_stage, a.current_status, a.processing_due_date,
                   i.name as institution_name, i.permanent_id, r.name as region_name, r.code as region_code,
                   u.full_name as acknowledged_by_name
            FROM escalation_events e
            JOIN applications a ON e.application_id = a.id
            JOIN institutions i ON a.institution_id = i.id
            JOIN regions r ON a.assigned_region_id = r.id
            LEFT JOIN users u ON e.escalated_to_user_id = u.id
            WHERE e.status IN ('TRIGGERED', 'ACKNOWLEDGED')
            ORDER BY e.escalation_level DESC, e.triggered_at DESC
        `);
    }

    /**
     * Get complete escalation history for an application
     */
    getEscalationHistory(applicationId) {
        return db.query(`
            SELECT e.*, u.full_name as officer_name, ov.full_name as override_by_name
            FROM escalation_events e
            LEFT JOIN users u ON e.escalated_to_user_id = u.id
            LEFT JOIN users ov ON e.override_actor_id = ov.id
            WHERE e.application_id = ?
            ORDER BY e.triggered_at DESC
        `, [applicationId]);
    }
}

module.exports = new EscalationEngine();
