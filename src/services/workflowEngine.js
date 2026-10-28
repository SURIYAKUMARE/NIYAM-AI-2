const crypto = require('node:crypto');
const db = require('../database/db');
const auditService = require('./auditService');
const { STAGES, STATUSES, DEFAULT_STAGE_SLA_DAYS } = require('../config/constants');

class WorkflowEngine {
    // Calculate stage deadline based on SLA days
    calculateStageDeadline(stageName, startDate = new Date()) {
        const slaDays = DEFAULT_STAGE_SLA_DAYS[stageName] || 7;
        const deadline = new Date(startDate);
        deadline.setDate(deadline.getDate() + slaDays);
        return deadline.toISOString();
    }

    // Execute state transition within a database transaction
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

            // 8. Update Application master record
            tx.execute(`
                UPDATE applications
                SET current_stage = ?, current_status = ?, processing_due_date = ?,
                    stage_entry_time = ?, updated_at = ?
                WHERE id = ?
            `, [toStage, newStatus, newStageDeadline, now, now, applicationId]);

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

            // 10. Log cryptographic tamper-evident audit event
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
                transitionId
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
            } else {
                // Resume without erasing historical entry timestamp
                tx.execute(`
                    UPDATE applications
                    SET is_on_hold = 0, hold_reason = NULL, hold_started_at = NULL, current_status = 'UNDER_SCRUTINY', updated_at = ?
                    WHERE id = ?
                `, [now, applicationId]);
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
