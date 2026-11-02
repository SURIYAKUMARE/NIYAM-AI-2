const crypto = require('node:crypto');
const db = require('../database/db');
const auditService = require('./auditService');
const dualClockEngine = require('./dualClockEngine');
const { STAGES, STATUSES, DEFAULT_STAGE_SLA_DAYS } = require('../config/constants');

/**
 * 13-STAGE NATIONAL REGULATORY WORKFLOW LIFECYCLE
 */
const STAGES_13 = [
    { number: 1, name: 'APPLICATION_SUBMISSION', label: '1. Application Submission', role: 'INSTITUTION_REP', clockType: 'COLLEGE_DELAY', slaDays: 3 },
    { number: 2, name: 'INITIAL_DOCUMENT_VALIDATION', label: '2. Initial Document Validation', role: 'SCRUTINY_MEMBER', clockType: 'OFFICER_PROCESSING', slaDays: 3 },
    { number: 3, name: 'SCRUTINY_OFFICER_ASSIGNMENT', label: '3. Scrutiny Officer Allocation', role: 'REGIONAL_OFFICER', clockType: 'OFFICER_PROCESSING', slaDays: 2 },
    { number: 4, name: 'DOCUMENT_DEFICIENCY_NOTIFICATION', label: '4. Deficiency Notification', role: 'SCRUTINY_MEMBER', clockType: 'OFFICER_PROCESSING', slaDays: 5 },
    { number: 5, name: 'COLLEGE_RESPONSE', label: '5. College Rectification Response', role: 'INSTITUTION_REP', clockType: 'COLLEGE_DELAY', slaDays: 10 },
    { number: 6, name: 'REVERIFICATION', label: '6. Scrutiny Reverification', role: 'SCRUTINY_MEMBER', clockType: 'OFFICER_PROCESSING', slaDays: 5 },
    { number: 7, name: 'EVC_SCHEDULING', label: '7. EVC Visit Scheduling', role: 'EVC_COORDINATOR', clockType: 'OFFICER_PROCESSING', slaDays: 4 },
    { number: 8, name: 'PHYSICAL_INSPECTION', label: '8. Physical On-Campus Inspection', role: 'EVC_MEMBER', clockType: 'OFFICER_PROCESSING', slaDays: 7 },
    { number: 9, name: 'INSPECTION_REPORT', label: '9. Inspection Report Compilation', role: 'EVC_MEMBER', clockType: 'OFFICER_PROCESSING', slaDays: 3 },
    { number: 10, name: 'REGIONAL_OFFICE_REVIEW', label: '10. Regional Office Review & Hearing', role: 'REGIONAL_OFFICER', clockType: 'OFFICER_PROCESSING', slaDays: 5 },
    { number: 11, name: 'SENIOR_OFFICER_REVIEW', label: '11. Senior Bureau Executive Review', role: 'REGULATION_BUREAU_ADMIN', clockType: 'OFFICER_PROCESSING', slaDays: 4 },
    { number: 12, name: 'FINAL_DECISION', label: '12. Final Statutory Sanction Order', role: 'COMPETENT_AUTHORITY', clockType: 'OFFICER_PROCESSING', slaDays: 5 },
    { number: 13, name: 'AUDIT_RECORD_GENERATION', label: '13. Immutable Cryptographic Seal', role: 'AUDITOR', clockType: 'OFFICER_PROCESSING', slaDays: 1 }
];

class WorkflowEngine {
    constructor() {
        this.STAGES_13 = STAGES_13;
    }

    // Calculate stage deadline based on SLA days
    calculateStageDeadline(stageName, startDate = new Date()) {
        const slaDays = DEFAULT_STAGE_SLA_DAYS[stageName] || 7;
        const deadline = new Date(startDate);
        deadline.setDate(deadline.getDate() + slaDays);
        return deadline.toISOString();
    }

    /**
     * Initialize all 13 stages in application_stages_13 for an application if not exists
     */
    init13Stages(applicationId, tx = db) {
        const existing = tx.queryOne('SELECT COUNT(*) as cnt FROM application_stages_13 WHERE application_id = ?', [applicationId]);
        if (existing && existing.cnt > 0) return;

        const now = new Date().toISOString();
        let cumulativeDays = 0;

        for (const stg of STAGES_13) {
            cumulativeDays += stg.slaDays;
            const slaDate = new Date();
            slaDate.setDate(slaDate.getDate() + cumulativeDays);

            tx.execute(`
                INSERT INTO application_stages_13 (
                    id, application_id, stage_number, stage_name, assigned_role,
                    status, start_time, sla_deadline, clock_type, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                crypto.randomUUID(),
                applicationId,
                stg.number,
                stg.name,
                stg.role,
                stg.number === 1 ? 'IN_PROGRESS' : 'PENDING',
                now,
                slaDate.toISOString(),
                stg.clockType,
                now
            ]);
        }
    }

    /**
     * Granular 13-stage advancement
     */
    advance13Stage({ applicationId, stageNumber, user, comments = '', evidenceRef = null }) {
        return db.transaction((tx) => {
            const targetStageDef = STAGES_13.find(s => s.number === stageNumber);
            if (!targetStageDef) throw new Error(`Invalid stage number: ${stageNumber}. Must be 1 to 13.`);

            const app = tx.queryOne('SELECT * FROM applications WHERE id = ?', [applicationId]);
            if (!app) throw new Error(`Application ${applicationId} not found.`);

            const now = new Date().toISOString();

            // Ensure 13-stage table populated
            this.init13Stages(applicationId, tx);

            // Complete prior active stages up to stageNumber - 1
            const activePrior = tx.query(`
                SELECT * FROM application_stages_13
                WHERE application_id = ? AND stage_number < ? AND status IN ('PENDING', 'IN_PROGRESS', 'DEFICIENT')
            `, [applicationId, stageNumber]);

            for (const pr of activePrior) {
                const startMs = new Date(pr.start_time).getTime();
                const endMs = new Date(now).getTime();
                const durSec = Math.max(0, Math.floor((endMs - startMs) / 1000));

                tx.execute(`
                    UPDATE application_stages_13
                    SET status = 'COMPLETED', completion_time = ?, pending_duration_seconds = ?, comments = ?
                    WHERE id = ?
                `, [now, durSec, comments || 'Stage concluded normally', pr.id]);
            }

            // Mark target stage as IN_PROGRESS
            tx.execute(`
                UPDATE application_stages_13
                SET status = 'IN_PROGRESS', start_time = ?, assigned_officer_id = ?, evidence_ref = ?, comments = ?
                WHERE application_id = ? AND stage_number = ?
            `, [now, user.id, evidenceRef, comments, applicationId, stageNumber]);

            // Update master application record
            tx.execute(`
                UPDATE applications
                SET detailed_stage_index = ?, detailed_stage_name = ?, updated_at = ?
                WHERE id = ?
            `, [stageNumber, targetStageDef.name, now, applicationId]);

            // Switch Dual Clock
            dualClockEngine.switchClock({
                applicationId,
                toClockType: targetStageDef.clockType,
                stageName: targetStageDef.name,
                responsibleEntityType: targetStageDef.clockType === 'COLLEGE_DELAY' ? 'INSTITUTION' : 'AICTE_OFFICER',
                actorId: user.id,
                reason: comments || `Advanced to stage ${targetStageDef.number}: ${targetStageDef.name}`
            });

            // Audit
            auditService.log({
                actorId: user.id,
                actorUsername: user.username,
                actorRole: user.role_code,
                actionType: 'ADVANCE_13_STAGE',
                entityName: 'applications',
                entityId: applicationId,
                previousState: { stage_index: app.detailed_stage_index || 1 },
                newState: { stage_index: stageNumber, stage_name: targetStageDef.name },
                justification: `Advanced application to Stage ${stageNumber} (${targetStageDef.name}): ${comments || 'Procedural milestone advancement'}`
            });

            return {
                applicationId,
                stageNumber,
                stageName: targetStageDef.name,
                clockType: targetStageDef.clockType,
                timestamp: now
            };
        });
    }

    /**
     * Get complete 13-stage telemetry for an application
     */
    get13StageTelemetry(applicationId) {
        this.init13Stages(applicationId);

        const stages = db.query(`
            SELECT s.*, u.full_name as officer_name, u.email as officer_email
            FROM application_stages_13 s
            LEFT JOIN users u ON s.assigned_officer_id = u.id
            WHERE s.application_id = ?
            ORDER BY s.stage_number ASC
        `, [applicationId]);

        const app = db.queryOne('SELECT * FROM applications WHERE id = ?', [applicationId]);
        const dualClock = dualClockEngine.getDualClockMetrics(applicationId);

        const nowMs = new Date().getTime();
        const enrichedStages = stages.map(stg => {
            const isCompleted = stg.status === 'COMPLETED';
            const isInProgress = stg.status === 'IN_PROGRESS';
            let liveDurationSec = stg.pending_duration_seconds || 0;

            if (isInProgress) {
                const startMs = new Date(stg.start_time).getTime();
                liveDurationSec = Math.max(0, Math.floor((nowMs - startMs) / 1000));
            }

            const slaMs = new Date(stg.sla_deadline).getTime();
            const isOverdue = isInProgress && nowMs > slaMs;

            return {
                ...stg,
                isCompleted,
                isInProgress,
                liveDurationSeconds: liveDurationSec,
                liveDurationHours: (liveDurationSec / 3600).toFixed(1),
                liveDurationDays: (liveDurationSec / 86400).toFixed(2),
                isOverdue,
                overdueHours: isOverdue ? ((nowMs - slaMs) / 3600000).toFixed(1) : 0
            };
        });

        return {
            applicationId,
            applicationNo: app ? app.application_no : null,
            currentStageIndex: app ? (app.detailed_stage_index || 1) : 1,
            currentStageName: app ? (app.detailed_stage_name || 'APPLICATION_SUBMISSION') : 'APPLICATION_SUBMISSION',
            stages: enrichedStages,
            dualClock
        };
    }

    // Execute state transition within a database transaction (7-Stage primary engine)
    transition({
        applicationId,
        toStage,
        toStatus = null,
        condition,
        user,
        comments = '',
        evidenceDocId = null
    }) {
        return db.transaction((tx) => {
            // 1. Fetch current application state with optimistic lock
            const app = tx.queryOne('SELECT * FROM applications WHERE id = ?', [applicationId]);
            if (!app) {
                throw new Error(`Application with ID ${applicationId} not found.`);
            }

            if (app.is_on_hold && toStage !== app.current_stage) {
                throw new Error('Application is currently on authorised regulatory hold. Resume case before advancing stage.');
            }

            const fromStage = app.current_stage;
            const fromStatus = app.current_status;

            // 2. Fetch workflow definition
            const wfDef = tx.queryOne('SELECT * FROM workflow_definitions WHERE id = ?', [app.workflow_definition_id]);
            if (!wfDef) {
                throw new Error(`Workflow definition ${app.workflow_definition_id} not found.`);
            }
            const definition = JSON.parse(wfDef.definition_json);

            // 3. Validate transition existence in workflow definition
            const validTransition = definition.transitions.find(t => 
                t.from === fromStage && t.to === toStage
            );

            // Allow administrative return or override only if authorized role
            const isSuperAdmin = user.role_code === 'SUPER_ADMIN';
            const isBureauAdmin = user.role_code === 'REGULATION_BUREAU_ADMIN';
            
            if (!validTransition && !isSuperAdmin && !isBureauAdmin) {
                throw new Error(`Unauthorised or illegal transition from stage '${fromStage}' to '${toStage}' under workflow '${wfDef.name}'.`);
            }

            // 4. Role Authorization check
            if (validTransition && validTransition.actorRole) {
                const allowedRoles = Array.isArray(validTransition.actorRole)
                    ? validTransition.actorRole
                    : [validTransition.actorRole];

                if (!allowedRoles.includes(user.role_code) && !isSuperAdmin && !isBureauAdmin) {
                    throw new Error(`Actor role '${user.role_code}' is not permitted to execute this transition. Required: '${allowedRoles.join(' or ')}'.`);
                }
            }

            // 5. Pre-condition checks: Prevent skipping unresolved critical deficiencies
            if (fromStage === STAGES.SCRUTINY && toStage === STAGES.EVC) {
                const unresolvedDeficiencies = tx.queryOne(`
                    SELECT COUNT(*) as count FROM deficiencies 
                    WHERE application_id = ? AND status IN ('RAISED', 'DEFICIENT_PERSISTS')
                `, [applicationId]);

                if (unresolvedDeficiencies && unresolvedDeficiencies.count > 0) {
                    throw new Error(`Cannot advance to EVC: Application has ${unresolvedDeficiencies.count} unaddressed deficiencies. Must route through RE_SCRUTINY.`);
                }
            }

            // Determine new status if not explicitly given
            let newStatus = toStatus;
            if (!newStatus) {
                if (toStage === STAGES.SCRUTINY) newStatus = STATUSES.UNDER_SCRUTINY;
                else if (toStage === STAGES.RE_SCRUTINY) newStatus = STATUSES.DEFICIENCY_RAISED;
                else if (toStage === STAGES.EVC) newStatus = STATUSES.AWAITING_EVC;
                else if (toStage === STAGES.SAC_SHC) newStatus = STATUSES.SAC_REVIEW;
                else if (toStage === STAGES.COMPETENT_DECISION) newStatus = STATUSES.DECISION_PENDING;
                else if (toStage === STAGES.APPROVED) newStatus = STATUSES.APPROVED;
                else if (toStage === STAGES.REJECTED) newStatus = STATUSES.REJECTED;
                else newStatus = app.current_status;
            }

            const now = new Date().toISOString();
            const newStageDeadline = this.calculateStageDeadline(toStage);

            // 6. Complete preceding active stage record
            tx.execute(`
                UPDATE workflow_stages
                SET stage_status = 'COMPLETED', completed_at = ?, outcome = ?, comments = ?
                WHERE application_id = ? AND stage_name = ? AND stage_status IN ('PENDING', 'IN_PROGRESS', 'DEFICIENCY')
            `, [now, condition || 'ADVANCED', comments, applicationId, fromStage]);

            // 7. Insert new stage record
            const newStageId = crypto.randomUUID();
            const targetStageDef = definition.stages.find(s => s.name === toStage);
            const assignedRole = targetStageDef ? targetStageDef.allowedRoles[0] : 'OFFICER';

            tx.execute(`
                INSERT INTO workflow_stages (
                    id, application_id, stage_name, stage_status, assigned_to_role,
                    entered_at, due_at
                ) VALUES (?, ?, ?, 'IN_PROGRESS', ?, ?, ?)
            `, [newStageId, applicationId, toStage, assignedRole, now, newStageDeadline]);

            // Map 7-stage to 13-stage detailed index
            let detailedIndex = 1;
            let detailedName = 'APPLICATION_SUBMISSION';
            if (toStage === STAGES.SCRUTINY) { detailedIndex = 3; detailedName = 'SCRUTINY_OFFICER_ASSIGNMENT'; }
            else if (toStage === STAGES.RE_SCRUTINY) { detailedIndex = 6; detailedName = 'REVERIFICATION'; }
            else if (toStage === STAGES.EVC) { detailedIndex = 7; detailedName = 'EVC_SCHEDULING'; }
            else if (toStage === STAGES.SAC_SHC) { detailedIndex = 10; detailedName = 'REGIONAL_OFFICE_REVIEW'; }
            else if (toStage === STAGES.COMPETENT_DECISION) { detailedIndex = 12; detailedName = 'FINAL_DECISION'; }
            else if (toStage === STAGES.APPROVED || toStage === STAGES.REJECTED) { detailedIndex = 13; detailedName = 'AUDIT_RECORD_GENERATION'; }

            // 8. Update Application master record
            tx.execute(`
                UPDATE applications
                SET current_stage = ?, current_status = ?, processing_due_date = ?,
                    stage_entry_time = ?, detailed_stage_index = ?, detailed_stage_name = ?, updated_at = ?
                WHERE id = ?
            `, [toStage, newStatus, newStageDeadline, now, detailedIndex, detailedName, now, applicationId]);

            // 9. Record immutable stage transition
            const transitionId = crypto.randomUUID();
            tx.execute(`
                INSERT INTO stage_transitions (
                    id, application_id, from_stage, to_stage, actor_user_id,
                    actor_role, transition_type, rule_version, comments, evidence_doc_id, timestamp
                ) VALUES (?, ?, ?, ?, ?, ?, 'FORWARD', ?, ?, ?, ?)
            `, [
                transitionId, applicationId, fromStage, toStage, user.id,
                user.role_code, `v${wfDef.version}`, comments, evidenceDocId, now
            ]);

            // 10. Switch Dual-Clock
            const clockType = (toStage === STAGES.RE_SCRUTINY && newStatus === STATUSES.DEFICIENCY_RAISED) 
                ? 'COLLEGE_DELAY' 
                : (toStage === STAGES.SUBMITTED ? 'OFFICER_PROCESSING' : 'OFFICER_PROCESSING');
            
            dualClockEngine.switchClock({
                applicationId,
                toClockType: clockType,
                stageName: toStage,
                responsibleEntityType: clockType === 'COLLEGE_DELAY' ? 'INSTITUTION' : 'AICTE_OFFICER',
                actorId: user.id,
                reason: comments || `Transitioned to ${toStage}`
            });

            // 11. Log cryptographic tamper-evident audit event
            auditService.log({
                actorId: user.id,
                actorUsername: user.username,
                actorRole: user.role_code,
                actionType: 'WORKFLOW_TRANSITION',
                entityName: 'applications',
                entityId: applicationId,
                previousState: { stage: fromStage, status: fromStatus },
                newState: { stage: toStage, status: newStatus, due_date: newStageDeadline },
                justification: `Transitioned application from ${fromStage} to ${toStage}: ${comments || condition || 'Standard procedural workflow hop'}`,
                workflowRuleVersion: `v${wfDef.version}`
            });

            return {
                applicationId,
                fromStage,
                toStage,
                status: newStatus,
                stageDeadline: newStageDeadline,
                transitionId,
                detailedStageIndex: detailedIndex,
                detailedStageName: detailedName
            };
        });
    }

    // Toggle Authorised Regulatory Hold
    setHold({ applicationId, isHold, reason, user }) {
        return db.transaction((tx) => {
            const app = tx.queryOne('SELECT * FROM applications WHERE id = ?', [applicationId]);
            if (!app) throw new Error('Application not found.');

            const now = new Date().toISOString();
            if (isHold) {
                tx.execute(`
                    UPDATE applications
                    SET is_on_hold = 1, hold_reason = ?, hold_started_at = ?, current_status = 'ON_HOLD', updated_at = ?
                    WHERE id = ?
                `, [reason, now, now, applicationId]);

                dualClockEngine.switchClock({
                    applicationId,
                    toClockType: 'REGULATORY_HOLD',
                    stageName: app.current_stage,
                    responsibleEntityType: 'JUDICIAL_OR_REGULATORY_HOLD',
                    actorId: user.id,
                    reason: reason || 'Application placed on formal regulatory hold'
                });
            } else {
                tx.execute(`
                    UPDATE applications
                    SET is_on_hold = 0, hold_reason = NULL, hold_started_at = NULL, current_status = 'UNDER_SCRUTINY', updated_at = ?
                    WHERE id = ?
                `, [now, applicationId]);

                dualClockEngine.switchClock({
                    applicationId,
                    toClockType: 'OFFICER_PROCESSING',
                    stageName: app.current_stage,
                    responsibleEntityType: 'AICTE_OFFICER',
                    actorId: user.id,
                    reason: 'Formal regulatory hold lifted'
                });
            }

            auditService.log({
                actorId: user.id,
                actorUsername: user.username,
                actorRole: user.role_code,
                actionType: isHold ? 'HOLD_WORKFLOW' : 'RESUME_WORKFLOW',
                entityName: 'applications',
                entityId: applicationId,
                previousState: { is_on_hold: app.is_on_hold, status: app.current_status },
                newState: { is_on_hold: isHold ? 1 : 0, reason },
                justification: reason || (isHold ? 'Regulatory hold applied' : 'Hold lifted by authorized officer')
            });

            return { applicationId, isOnHold: isHold };
        });
    }
}

module.exports = new WorkflowEngine();
