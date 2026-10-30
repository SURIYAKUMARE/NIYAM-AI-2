const crypto = require('node:crypto');
const db = require('../database/db');
const workflowEngine = require('../services/workflowEngine');
const auditService = require('../services/auditService');
const { ROLES, STAGES, STATUSES } = require('../config/constants');

class ApplicationController {
    // List applications with extensive filtering and role/region isolation
    list(req, res) {
        try {
            let sql = `
                SELECT a.*, i.name as institution_name, i.permanent_id, i.state, i.district,
                       i.institution_type, i.category, r.name as region_name, r.code as region_code,
                       at.name as application_type_name, u.full_name as assigned_officer_name
                FROM applications a
                JOIN institutions i ON a.institution_id = i.id
                JOIN regions r ON a.assigned_region_id = r.id
                JOIN application_types at ON a.application_type_code = at.code
                LEFT JOIN users u ON a.assigned_officer_id = u.id
                WHERE 1=1
            `;
            const params = [];

            // Enforce data isolation
            if (req.enforcedRegionId) {
                sql += ' AND a.assigned_region_id = ?';
                params.push(req.enforcedRegionId);
            }
            if (req.enforcedInstitutionId) {
                sql += ' AND a.institution_id = ?';
                params.push(req.enforcedInstitutionId);
            }

            // User query filters
            if (req.query.regionId && !req.enforcedRegionId) {
                sql += ' AND a.assigned_region_id = ?';
                params.push(req.query.regionId);
            }
            if (req.query.stage) {
                sql += ' AND a.current_stage = ?';
                params.push(req.query.stage);
            }
            if (req.query.status) {
                sql += ' AND a.current_status = ?';
                params.push(req.query.status);
            }
            if (req.query.academicYear) {
                sql += ' AND a.academic_year = ?';
                params.push(req.query.academicYear);
            }
            if (req.query.search) {
                sql += ' AND (a.application_no LIKE ? OR i.name LIKE ? OR i.permanent_id LIKE ?)';
                const s = `%${req.query.search}%`;
                params.push(s, s, s);
            }

            sql += ' ORDER BY a.submission_date DESC';
            const applications = db.query(sql, params);
            return res.json({ applications, total: applications.length });
        } catch (err) {
            return res.status(500).json({ error: err.message });
        }
    }

    // Application Detail Case Workspace (Section 16: 8 Tabs)
    getCaseWorkspace(req, res) {
        try {
            const { id } = req.params;

            // 1. Overview & Institution details
            let appSql = `
                SELECT a.*, i.name as institution_name, i.permanent_id, i.address, i.state, i.district,
                       i.institution_type, i.category, i.establishment_year, i.contact_email, i.contact_phone,
                       r.name as region_name, r.code as region_code, r.headquarter,
                       at.name as application_type_name, at.description as application_type_desc,
                       u.full_name as assigned_officer_name, u.email as assigned_officer_email,
                       wf.name as workflow_name, wf.version as workflow_version
                FROM applications a
                JOIN institutions i ON a.institution_id = i.id
                JOIN regions r ON a.assigned_region_id = r.id
                JOIN application_types at ON a.application_type_code = at.code
                JOIN workflow_definitions wf ON a.workflow_definition_id = wf.id
                LEFT JOIN users u ON a.assigned_officer_id = u.id
                WHERE a.id = ?
            `;
            const app = db.queryOne(appSql, [id]);
            if (!app) {
                return res.status(404).json({ error: 'Application record not found.' });
            }

            // Security check: Institution Rep isolation
            if (req.enforcedInstitutionId && app.institution_id !== req.enforcedInstitutionId) {
                return res.status(403).json({ error: 'Unauthorised: You can only view applications for your own institution.' });
            }

            // Security check: Regional Officer isolation
            if (req.enforcedRegionId && app.assigned_region_id !== req.enforcedRegionId) {
                return res.status(403).json({ error: 'Unauthorised: You can only view applications assigned to your regional jurisdiction.' });
            }

            // 2. Tab: Workflow Stages History & Transitions
            const stagesHistory = db.query(`
                SELECT ws.*, u.full_name as officer_name 
                FROM workflow_stages ws
                LEFT JOIN users u ON ws.assigned_to_user_id = u.id
                WHERE ws.application_id = ?
                ORDER BY ws.entered_at ASC
            `, [id]);

            const transitions = db.query(`
                SELECT st.*, u.full_name as actor_name
                FROM stage_transitions st
                JOIN users u ON st.actor_user_id = u.id
                WHERE st.application_id = ?
                ORDER BY st.timestamp ASC
            `, [id]);

            // 3. Tab: Documents & Attachments
            const documents = db.query(`
                SELECT d.*, dt.name as doc_type_name, dt.is_mandatory, dt.requires_renewal,
                       u.full_name as verified_by_name
                FROM documents d
                JOIN document_types dt ON d.document_type_code = dt.code
                LEFT JOIN users u ON d.verified_by = u.id
                WHERE d.application_id = ? OR d.institution_id = ?
                ORDER BY dt.is_mandatory DESC, d.created_at DESC
            `, [id, app.institution_id]);

            // 4. Tab: Scrutiny Reviews & Deficiencies
            const scrutinyReviews = db.query(`
                SELECT sr.*, u.full_name as officer_name
                FROM scrutiny_reviews sr
                JOIN users u ON sr.scrutiny_officer_id = u.id
                WHERE sr.application_id = ?
                ORDER BY sr.review_date DESC
            `, [id]);

            const deficiencies = db.query(`
                SELECT * FROM deficiencies
                WHERE application_id = ?
                ORDER BY raised_at DESC
            `, [id]);

            // 5. Tab: EVC Inspection & Schedules
            const evcSchedules = db.query(`
                SELECT es.*, u.full_name as coordinator_name
                FROM evc_schedules es
                JOIN users u ON es.coordinator_id = u.id
                WHERE es.application_id = ?
                ORDER BY es.created_at DESC
            `, [id]);

            const evcReports = db.query(`
                SELECT er.*, u.full_name as submitted_by_name
                FROM evc_reports er
                JOIN users u ON er.submitted_by_officer_id = u.id
                WHERE er.application_id = ?
                ORDER BY er.submitted_at DESC
            `, [id]);

            let evcMembers = [];
            if (evcSchedules.length > 0) {
                evcMembers = db.query(`
                    SELECT * FROM evc_members WHERE evc_schedule_id = ?
                `, [evcSchedules[0].id]);
            }

            // 6. Tab: Compliance & Undertakings
            const undertakings = db.query(`
                SELECT u.*, us.full_name as verified_by_name
                FROM undertakings u
                LEFT JOIN users us ON u.verified_by = us.id
                WHERE u.application_id = ? OR u.institution_id = ?
                ORDER BY u.due_date ASC
            `, [id, app.institution_id]);

            // 7. Tab: Communication & Notices
            const notifications = db.query(`
                SELECT * FROM notifications
                WHERE institution_id = ?
                ORDER BY sent_at DESC
            `, [app.institution_id]);

            // 8. Tab: Cryptographic Audit History
            const auditHistory = auditService.getHistoryForEntity('applications', id);

            return res.json({
                overview: app,
                application: app,
                workflow: { stages: stagesHistory, transitions },
                documents,
                scrutiny: { reviews: scrutinyReviews, deficiencies },
                evc: { schedules: evcSchedules, reports: evcReports, members: evcMembers },
                compliance: { undertakings },
                communication: { notifications },
                auditHistory
            });
        } catch (err) {
            return res.status(500).json({ error: err.message });
        }
    }

    // Submit new application by Institution Representative
    submit(req, res) {
        try {
            const { applicationTypeCode, academicYear, institutionId } = req.body;
            const user = req.user;

            const instId = req.enforcedInstitutionId || institutionId;
            if (!instId) {
                return res.status(400).json({ error: 'Institution ID is required.' });
            }

            const inst = db.queryOne('SELECT * FROM institutions WHERE id = ?', [instId]);
            if (!inst) {
                return res.status(404).json({ error: 'Institution not found.' });
            }

            const appType = db.queryOne('SELECT * FROM application_types WHERE code = ?', [applicationTypeCode]);
            if (!appType) {
                return res.status(400).json({ error: 'Invalid application type.' });
            }

            const wfDef = db.queryOne(`
                SELECT * FROM workflow_definitions 
                WHERE code = ? AND status = 'PUBLISHED' 
                ORDER BY version DESC LIMIT 1
            `, [appType.default_workflow_code]);

            if (!wfDef) {
                return res.status(400).json({ error: 'No published workflow definition found for this application type.' });
            }

            const id = `APP_${Date.now()}`;
            const appNo = `AICTE-${academicYear || '2026'}-${Math.floor(10000 + Math.random() * 90000)}`;
            const now = new Date().toISOString();
            const dueDate = workflowEngine.calculateStageDeadline(STAGES.SCRUTINY);

            db.transaction((tx) => {
                tx.execute(`
                    INSERT INTO applications (
                        id, application_no, institution_id, application_type_code, academic_year,
                        current_stage, current_status, workflow_definition_id, submission_date,
                        processing_due_date, stage_entry_time, assigned_region_id
                    ) VALUES (?, ?, ?, ?, ?, 'SCRUTINY', 'UNDER_SCRUTINY', ?, ?, ?, ?, ?)
                `, [
                    id, appNo, instId, applicationTypeCode, academicYear || '2026-2027',
                    wfDef.id, now, dueDate, now, inst.region_id
                ]);

                // Create initial stage history record
                tx.execute(`
                    INSERT INTO workflow_stages (
                        id, application_id, stage_name, stage_status, assigned_to_role, entered_at, due_at
                    ) VALUES (?, ?, 'SCRUTINY', 'IN_PROGRESS', 'SCRUTINY_MEMBER', ?, ?)
                `, [crypto.randomUUID(), id, now, dueDate]);

                // Initial transition
                tx.execute(`
                    INSERT INTO stage_transitions (
                        id, application_id, from_stage, to_stage, actor_user_id,
                        actor_role, transition_type, rule_version, comments, timestamp
                    ) VALUES (?, ?, 'SUBMITTED', 'SCRUTINY', ?, ?, 'FORWARD', ?, 'New application submitted by institution representative.', ?)
                `, [crypto.randomUUID(), id, user.id, user.role_code, `v${wfDef.version}`, now]);

                auditService.log({
                    actorId: user.id,
                    actorUsername: user.username,
                    actorRole: user.role_code,
                    actionType: 'SUBMIT_APPLICATION',
                    entityName: 'applications',
                    entityId: id,
                    newState: { applicationNo: appNo, stage: 'SCRUTINY', status: 'UNDER_SCRUTINY' },
                    justification: `Application ${appNo} submitted by ${inst.name}`
                });
            });

            return res.status(201).json({
                message: 'Application submitted successfully and routed to Scrutiny stage.',
                applicationId: id,
                applicationNo: appNo
            });
        } catch (err) {
            return res.status(500).json({ error: err.message });
        }
    }

    // Advance workflow transition
    advanceWorkflow(req, res) {
        try {
            const { id } = req.params;
            const { toStage, toStatus, condition, comments } = req.body;

            const result = workflowEngine.transition({
                applicationId: id,
                toStage,
                toStatus,
                condition,
                user: req.user,
                comments
            });

            return res.json({
                message: `Application advanced successfully to stage '${toStage}'.`,
                result
            });
        } catch (err) {
            return res.status(400).json({ error: err.message });
        }
    }

    // Toggle administrative hold
    setHold(req, res) {
        try {
            const { id } = req.params;
            const { isHold, reason } = req.body;

            const result = workflowEngine.setHold({
                applicationId: id,
                isHold: Boolean(isHold),
                reason,
                user: req.user
            });

            return res.json({
                message: isHold ? 'Application placed on regulatory hold.' : 'Regulatory hold lifted.',
                result
            });
        } catch (err) {
            return res.status(400).json({ error: err.message });
        }
    }
}

module.exports = new ApplicationController();
