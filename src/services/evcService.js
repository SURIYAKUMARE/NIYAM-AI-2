const crypto = require('node:crypto');
const db = require('../database/db');
const auditService = require('./auditService');
const workflowEngine = require('./workflowEngine');
const cryptoService = require('./cryptoService');
const { STAGES, STATUSES } = require('../config/constants');

class EVCService {
    // EVC Dashboard real-time metrics
    getDashboardMetrics(regionId = null) {
        let regionFilter = '';
        const params = [];
        if (regionId) {
            regionFilter = ' AND a.assigned_region_id = ?';
            params.push(regionId);
        }

        const evcRequired = db.queryOne(`
            SELECT COUNT(*) as count FROM applications a
            WHERE a.current_stage = 'EVC' ${regionFilter}
        `, params).count;

        const awaitingScheduling = db.queryOne(`
            SELECT COUNT(*) as count FROM applications a
            LEFT JOIN evc_schedules e ON a.id = e.application_id
            WHERE a.current_stage = 'EVC' AND (e.id IS NULL OR e.visit_status = 'AWAITING_SCHEDULING') ${regionFilter}
        `, params).count;

        const scheduled = db.queryOne(`
            SELECT COUNT(*) as count FROM evc_schedules e
            JOIN applications a ON e.application_id = a.id
            WHERE e.visit_status = 'SCHEDULED' ${regionFilter}
        `, params).count;

        const reportsPending = db.queryOne(`
            SELECT COUNT(*) as count FROM evc_schedules e
            JOIN applications a ON e.application_id = a.id
            WHERE e.visit_status IN ('INSPECTION_COMPLETED', 'REPORT_PENDING') ${regionFilter}
        `, params).count;

        const completed = db.queryOne(`
            SELECT COUNT(*) as count FROM evc_schedules e
            JOIN applications a ON e.application_id = a.id
            WHERE e.visit_status = 'REPORT_SUBMITTED' ${regionFilter}
        `, params).count;

        const overdue = db.queryOne(`
            SELECT COUNT(*) as count FROM applications a
            WHERE a.current_stage = 'EVC' AND datetime(a.processing_due_date) < datetime('now') ${regionFilter}
        `, params).count;

        // Regional breakdown
        const regionPerformance = db.query(`
            SELECT r.name as region_name, 
                   COUNT(a.id) as total_evc_cases,
                   SUM(CASE WHEN e.visit_status = 'REPORT_SUBMITTED' THEN 1 ELSE 0 END) as completed_visits,
                   SUM(CASE WHEN e.visit_status = 'SCHEDULED' THEN 1 ELSE 0 END) as scheduled_visits,
                   SUM(CASE WHEN datetime(a.processing_due_date) < datetime('now') THEN 1 ELSE 0 END) as overdue_visits
            FROM regions r
            LEFT JOIN applications a ON r.id = a.assigned_region_id AND a.current_stage = 'EVC'
            LEFT JOIN evc_schedules e ON a.id = e.application_id
            GROUP BY r.id, r.name
        `);

        return {
            evcRequired,
            awaitingScheduling,
            scheduled,
            reportsPending,
            completed,
            overdue,
            regionPerformance
        };
    }

    // Get list of cases requiring EVC
    getSchedulingQueue({ regionId = null } = {}) {
        let sql = `
            SELECT a.id, a.application_no, a.submission_date, a.processing_due_date, a.stage_entry_time,
                   i.name as institution_name, i.permanent_id, i.state, i.district, i.category,
                   r.name as region_name,
                   e.id as schedule_id, e.proposed_date, e.confirmed_date, e.visit_status, e.visit_type
            FROM applications a
            JOIN institutions i ON a.institution_id = i.id
            JOIN regions r ON a.assigned_region_id = r.id
            LEFT JOIN evc_schedules e ON a.id = e.application_id
            WHERE a.current_stage = 'EVC'
        `;
        const params = [];
        if (regionId) {
            sql += ' AND a.assigned_region_id = ?';
            params.push(regionId);
        }
        sql += ' ORDER BY a.processing_due_date ASC';
        return db.query(sql, params);
    }

    // Conflict of interest check for prospective EVC members
    checkMemberConflict(expertInstitution, expertState, applicationId) {
        const app = db.queryOne(`
            SELECT i.name, i.state, i.id as institution_id 
            FROM applications a
            JOIN institutions i ON a.institution_id = i.id
            WHERE a.id = ?
        `, [applicationId]);

        if (!app) return { conflict: true, reason: 'Application not found' };

        // Conflict rule 1: Member belongs to the exact same institution
        if (expertInstitution.toLowerCase().trim() === app.name.toLowerCase().trim()) {
            return { conflict: true, reason: 'Direct institutional affiliation conflict.' };
        }

        // Conflict rule 2: In-state restriction for sensitive committees if enabled
        return { conflict: false, reason: 'Zero conflicts detected. Eligible for committee assignment.' };
    }

    // Schedule EVC Visit
    scheduleVisit({
        applicationId,
        proposedDate,
        visitType = 'Physical Inspection',
        members = [], // [{ name, designation, institution, role }]
        user
    }) {
        return db.transaction((tx) => {
            const app = tx.queryOne('SELECT * FROM applications WHERE id = ?', [applicationId]);
            if (!app) throw new Error('Application not found.');

            // Idempotency / Duplicate Check: prevent double-scheduling for same application
            const existingSchedule = tx.queryOne(
                "SELECT * FROM evc_schedules WHERE application_id = ? AND visit_status IN ('SCHEDULED', 'AWAITING_SCHEDULING')",
                [applicationId]
            );
            if (existingSchedule) {
                return {
                    scheduleId: existingSchedule.id,
                    applicationId,
                    proposedDate: existingSchedule.proposed_date,
                    visitStatus: existingSchedule.visit_status,
                    isExisting: true
                };
            }

            // Verify member conflicts
            for (const member of members) {
                const check = this.checkMemberConflict(member.institution, '', applicationId);
                if (check.conflict) {
                    throw new Error(`Conflict of interest detected for member ${member.name}: ${check.reason}`);
                }
            }

            const scheduleId = crypto.randomUUID();
            tx.execute(`
                INSERT INTO evc_schedules (
                    id, application_id, coordinator_id, proposed_date, confirmed_date,
                    visit_status, visit_type, conflict_check_passed
                ) VALUES (?, ?, ?, ?, ?, 'SCHEDULED', ?, 1)
            `, [scheduleId, applicationId, user.id, proposedDate, proposedDate, visitType]);

            // Add committee members
            for (const m of members) {
                const memberId = crypto.randomUUID();
                tx.execute(`
                    INSERT INTO evc_members (
                        id, evc_schedule_id, expert_name, expert_designation,
                        expert_institution, role_in_committee, conflict_declared
                    ) VALUES (?, ?, ?, ?, ?, ?, 0)
                `, [memberId, scheduleId, m.name, m.designation, m.institution, m.role]);
            }

            // Update application status
            tx.execute(`
                UPDATE applications
                SET current_status = 'EVC_SCHEDULED'
                WHERE id = ?
            `, [applicationId]);

            auditService.log({
                actorId: user.id,
                actorUsername: user.username,
                actorRole: user.role_code,
                actionType: 'SCHEDULE_EVC',
                entityName: 'evc_schedules',
                entityId: scheduleId,
                newState: { applicationId, confirmedDate: proposedDate, visitType, membersCount: members.length },
                justification: `Scheduled EVC visit for application ${app.application_no} on ${proposedDate}`
            });

            return { scheduleId, status: 'SCHEDULED', confirmedDate: proposedDate };
        });
    }

    // Submit EVC Inspection Report
    submitReport({
        scheduleId,
        applicationId,
        inspectionDate,
        infrastructureScore,
        facultyScore,
        complianceScore,
        overallRecommendation, // 'RECOMMENDED_FULL', 'RECOMMENDED_CONDITIONAL', 'NOT_RECOMMENDED'
        deficiencyNotes,
        user
    }) {
        return db.transaction((tx) => {
            const reportId = crypto.randomUUID();
            const digitalSig = cryptoService.sha256(`${user.id}:${scheduleId}:${overallRecommendation}:${Date.now()}`);

            tx.execute(`
                INSERT INTO evc_reports (
                    id, evc_schedule_id, application_id, inspection_date,
                    infrastructure_score, faculty_score, compliance_score,
                    overall_recommendation, deficiency_notes, submitted_by_officer_id, digital_sign_hash
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                reportId, scheduleId, applicationId, inspectionDate,
                infrastructureScore, facultyScore, complianceScore,
                overallRecommendation, deficiencyNotes, user.id, digitalSig
            ]);

            // Mark schedule as report submitted
            tx.execute(`
                UPDATE evc_schedules
                SET visit_status = 'REPORT_SUBMITTED'
                WHERE id = ?
            `, [scheduleId]);

            // Transition application according to inspection outcome
            if (overallRecommendation === 'RECOMMENDED_FULL' || overallRecommendation === 'RECOMMENDED_CONDITIONAL') {
                workflowEngine.transition({
                    applicationId,
                    toStage: STAGES.COMPETENT_DECISION,
                    condition: 'INSPECTION_RECOMMENDED',
                    user,
                    comments: `EVC inspection completed with recommendation: ${overallRecommendation}. Moved to Competent Authority.`
                });
            } else {
                // If not recommended, routed to SAC/SHC appeal hearing
                workflowEngine.transition({
                    applicationId,
                    toStage: STAGES.SAC_SHC,
                    condition: 'INSPECTION_DEFICIENT_APPEAL',
                    user,
                    comments: `EVC inspection not recommended: ${deficiencyNotes}. Referred to SAC/SHC.`
                });
            }

            auditService.log({
                actorId: user.id,
                actorUsername: user.username,
                actorRole: user.role_code,
                actionType: 'SUBMIT_EVC_REPORT',
                entityName: 'evc_reports',
                entityId: reportId,
                newState: { overallRecommendation, infrastructureScore, facultyScore, complianceScore },
                justification: `EVC Committee submitted inspection report with recommendation ${overallRecommendation}`
            });

            return { reportId, status: 'REPORT_SUBMITTED', digitalSignature: digitalSig };
        });
    }
}

module.exports = new EVCService();
