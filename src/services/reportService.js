const db = require('../database/db');

class ReportService {
    // List available report types
    getAvailableReports() {
        return [
            { id: 'consolidated_apps', name: 'Consolidated Application Status Report', category: 'Applications' },
            { id: 'region_pendency', name: 'Region-wise Application Pendency Report', category: 'Pendency' },
            { id: 'stage_performance', name: 'Stage-wise Processing Performance', category: 'Workflows' },
            { id: 'officer_workload', name: 'Officer Workload & Allocation Distribution', category: 'Administration' },
            { id: 'evc_schedules', name: 'EVC Scheduling and Completion Analysis', category: 'EVC' },
            { id: 'evc_overdue', name: 'Overdue EVC Cases Register', category: 'EVC' },
            { id: 'pending_undertakings', name: 'Institutional Undertakings Pending Verification', category: 'Compliance' },
            { id: 'compliance_verification', name: 'Compliance Evidence Verification Status', category: 'Compliance' },
            { id: 'expiring_leases', name: 'Expiring Lease and Land Deeds (Next 90 Days)', category: 'Documents' },
            { id: 'expired_documents', name: 'Expired Mandatory Documents Register', category: 'Documents' },
            { id: 'escalated_cases', name: 'Escalated Cases and Bottleneck Register', category: 'Escalations' },
            { id: 'processing_duration', name: 'Application Processing Time (Ageing Breakdown)', category: 'Analytics' },
            { id: 'workflow_exceptions', name: 'Regulatory Workflow Exceptions and Holds', category: 'Workflows' },
            { id: 'audit_trail_report', name: 'Cryptographic Audit Activity Trail', category: 'Audit' }
        ];
    }

    // Generate report data by report ID
    generateReport(reportId, filters = {}) {
        const generationTime = new Date().toISOString();
        let records = [];
        let title = '';

        switch (reportId) {
            case 'consolidated_apps':
                title = 'Consolidated Application Status Report';
                records = db.query(`
                    SELECT a.application_no, i.name as institution_name, i.permanent_id, r.name as region,
                           at.name as application_type, a.current_stage, a.current_status,
                           a.submission_date, a.processing_due_date, a.is_on_hold
                    FROM applications a
                    JOIN institutions i ON a.institution_id = i.id
                    JOIN regions r ON a.assigned_region_id = r.id
                    JOIN application_types at ON a.application_type_code = at.code
                    ORDER BY a.submission_date DESC
                `);
                break;

            case 'region_pendency':
                title = 'Region-wise Application Pendency Report';
                records = db.query(`
                    SELECT r.code, r.name as region_name, r.headquarter,
                           COUNT(a.id) as total_applications,
                           SUM(CASE WHEN a.current_stage IN ('SCRUTINY', 'RE_SCRUTINY') THEN 1 ELSE 0 END) as scrutiny_pending,
                           SUM(CASE WHEN a.current_stage = 'EVC' THEN 1 ELSE 0 END) as evc_pending,
                           SUM(CASE WHEN datetime(a.processing_due_date) < datetime('now') AND a.current_stage NOT IN ('APPROVED', 'REJECTED') THEN 1 ELSE 0 END) as overdue_count
                    FROM regions r
                    LEFT JOIN applications a ON r.id = a.assigned_region_id
                    GROUP BY r.id, r.code, r.name, r.headquarter
                `);
                break;

            case 'stage_performance':
                title = 'Stage-wise Processing Performance';
                records = db.query(`
                    SELECT stage_name, 
                           COUNT(id) as total_entries,
                           SUM(CASE WHEN stage_status = 'COMPLETED' THEN 1 ELSE 0 END) as completed_count,
                           SUM(CASE WHEN stage_status = 'IN_PROGRESS' THEN 1 ELSE 0 END) as active_count,
                           AVG(CASE WHEN completed_at IS NOT NULL THEN (julianday(completed_at) - julianday(entered_at)) ELSE NULL END) as avg_days_to_complete
                    FROM workflow_stages
                    GROUP BY stage_name
                `);
                break;

            case 'officer_workload':
                title = 'Officer Workload & Allocation Distribution';
                records = db.query(`
                    SELECT u.full_name as officer_name, u.role_code, r.name as region,
                           COUNT(a.id) as active_assigned_cases,
                           SUM(CASE WHEN datetime(a.processing_due_date) < datetime('now') THEN 1 ELSE 0 END) as overdue_cases
                    FROM users u
                    LEFT JOIN applications a ON u.id = a.assigned_officer_id AND a.current_stage NOT IN ('APPROVED', 'REJECTED')
                    LEFT JOIN regions r ON u.region_id = r.id
                    WHERE u.role_code IN ('REGIONAL_OFFICER', 'SCRUTINY_MEMBER', 'EVC_COORDINATOR', 'COMPLIANCE_OFFICER')
                    GROUP BY u.id, u.full_name, u.role_code, r.name
                `);
                break;

            case 'evc_schedules':
                title = 'EVC Scheduling and Completion Analysis';
                records = db.query(`
                    SELECT e.id, a.application_no, i.name as institution_name, r.name as region,
                           e.proposed_date, e.confirmed_date, e.visit_status, e.visit_type,
                           er.overall_recommendation, er.infrastructure_score, er.faculty_score
                    FROM evc_schedules e
                    JOIN applications a ON e.application_id = a.id
                    JOIN institutions i ON a.institution_id = i.id
                    JOIN regions r ON a.assigned_region_id = r.id
                    LEFT JOIN evc_reports er ON e.id = er.evc_schedule_id
                `);
                break;

            case 'pending_undertakings':
                title = 'Institutional Undertakings Pending Verification';
                records = db.query(`
                    SELECT u.undertaking_ref, i.name as institution_name, i.permanent_id,
                           u.condition_title, u.issue_date, u.due_date, u.status,
                           u.responsible_person
                    FROM undertakings u
                    JOIN institutions i ON u.institution_id = i.id
                    WHERE u.status IN ('PENDING', 'SUBMITTED', 'UNDER_VERIFICATION', 'OVERDUE')
                    ORDER BY u.due_date ASC
                `);
                break;

            case 'expiring_leases':
                title = 'Expiring Lease and Land Deeds (Next 90 Days)';
                records = db.query(`
                    SELECT d.document_title, dt.name as doc_type, i.name as institution_name,
                           i.permanent_id, r.name as region, d.issue_date, d.expiry_date,
                           d.current_status
                    FROM documents d
                    JOIN document_types dt ON d.document_type_code = dt.code
                    JOIN institutions i ON d.institution_id = i.id
                    JOIN regions r ON i.region_id = r.id
                    WHERE d.expiry_date IS NOT NULL 
                    AND datetime(d.expiry_date) <= datetime('now', '+90 days')
                    ORDER BY d.expiry_date ASC
                `);
                break;

            case 'audit_trail_report':
                title = 'Cryptographic Audit Activity Trail';
                records = db.query(`
                    SELECT id, event_uuid, actor_username, actor_role, action_type,
                           entity_name, entity_id, justification, prev_hash, current_hash, created_at
                    FROM audit_events
                    ORDER BY id DESC LIMIT 100
                `);
                break;

            default:
                title = 'Consolidated Summary';
                records = db.query('SELECT application_no, current_stage, current_status FROM applications LIMIT 50');
        }

        return {
            reportId,
            title,
            generatedAt: generationTime,
            recordCount: records.length,
            records
        };
    }

    // Convert records to CSV format
    convertToCSV(records) {
        if (!records || records.length === 0) return '';
        const headers = Object.keys(records[0]);
        const csvRows = [headers.join(',')];

        for (const row of records) {
            const values = headers.map(header => {
                const val = row[header];
                if (val === null || val === undefined) return '""';
                const str = String(val).replace(/"/g, '""');
                return `"${str}"`;
            });
            csvRows.push(values.join(','));
        }

        return csvRows.join('\n');
    }

    // 7 MANDATED PILOT INDICATORS (SIH26262 Performance Specifications)
    getPilotIndicators() {
        // 1. Pending applications by stage
        const stageRows = db.query(`
            SELECT current_stage, COUNT(id) as count
            FROM applications
            WHERE current_stage NOT IN ('APPROVED', 'REJECTED')
            GROUP BY current_stage
        `);
        const pendingByStage = {};
        for (const row of stageRows) {
            pendingByStage[row.current_stage] = row.count;
        }

        // 2. Mean submission-to-decision time (in days)
        const decidedCases = db.query(`
            SELECT a.submission_date,
                   COALESCE(sd.decision_date, st.timestamp, a.updated_at) as decision_date
            FROM applications a
            LEFT JOIN statutory_decisions sd ON a.id = sd.application_id
            LEFT JOIN stage_transitions st ON a.id = st.application_id AND st.to_stage IN ('APPROVED', 'REJECTED')
            WHERE a.current_stage IN ('APPROVED', 'REJECTED')
        `);
        let totalDecisionDays = 0;
        let validDecisionCount = 0;
        for (const c of decidedCases) {
            if (c.submission_date && c.decision_date) {
                const diffDays = (new Date(c.decision_date) - new Date(c.submission_date)) / 86400000;
                if (diffDays >= 0) {
                    totalDecisionDays += diffDays;
                    validDecisionCount++;
                }
            }
        }
        const meanSubmissionToDecisionDays = validDecisionCount > 0 
            ? Number((totalDecisionDays / validDecisionCount).toFixed(1)) 
            : 0;

        // 3. Overdue actions divided by open actions with due dates
        const openAppActions = db.queryOne(`
            SELECT COUNT(*) as total,
                   SUM(CASE WHEN datetime(processing_due_date) < datetime('now') THEN 1 ELSE 0 END) as overdue
            FROM applications
            WHERE current_stage NOT IN ('APPROVED', 'REJECTED')
        `);
        const openUtkActions = db.queryOne(`
            SELECT COUNT(*) as total,
                   SUM(CASE WHEN datetime(due_date) < datetime('now') THEN 1 ELSE 0 END) as overdue
            FROM undertakings
            WHERE status IN ('PENDING', 'UPCOMING', 'OVERDUE')
        `);
        const openActionsWithDueDates = (openAppActions?.total || 0) + (openUtkActions?.total || 0);
        const overdueActionsCount = (openAppActions?.overdue || 0) + (openUtkActions?.overdue || 0);
        const overdueActionsRatio = openActionsWithDueDates > 0
            ? Number((overdueActionsCount / openActionsWithDueDates).toFixed(3))
            : 0;

        // 4. Mean EVC request-to-schedule time (days from proposed/creation to confirmed_date)
        const evcScheduled = db.query(`
            SELECT proposed_date, confirmed_date, created_at
            FROM evc_schedules
            WHERE confirmed_date IS NOT NULL
        `);
        let totalEvcScheduleDays = 0;
        let validEvcCount = 0;
        for (const e of evcScheduled) {
            const start = new Date(e.created_at || e.proposed_date);
            const confirmed = new Date(e.confirmed_date);
            const diffDays = Math.max(0, (confirmed - start) / 86400000);
            totalEvcScheduleDays += diffDays;
            validEvcCount++;
        }
        const meanEvcRequestToScheduleDays = validEvcCount > 0
            ? Number((totalEvcScheduleDays / validEvcCount).toFixed(1))
            : 0;

        // 5. On-time evidence submissions divided by submissions due
        const submissions = db.query(`
            SELECT cs.submission_date, u.due_date
            FROM compliance_submissions cs
            JOIN undertakings u ON cs.undertaking_id = u.id
        `);
        let onTimeCount = 0;
        for (const s of submissions) {
            if (new Date(s.submission_date) <= new Date(s.due_date + 'T23:59:59')) {
                onTimeCount++;
            }
        }
        const submissionsDueTotal = Math.max(submissions.length, db.queryOne('SELECT COUNT(*) as count FROM undertakings').count || 1);
        const onTimeEvidenceSubmissionsRatio = submissionsDueTotal > 0
            ? Number((onTimeCount / submissionsDueTotal).toFixed(3))
            : 0;

        // 6. Document expiry alerts generated
        const docExpiryAlertsGenerated = db.queryOne(`
            SELECT COUNT(*) as count FROM notifications
            WHERE event_type IN ('LEASE_EXPIRING', 'DOCUMENT_EXPIRING', 'UNDERTAKING_OVERDUE')
        `)?.count || 0;

        // 7. Escalation response time (mean hours from triggered_at to acknowledged_at/resolved_at)
        const escalations = db.query(`
            SELECT triggered_at, acknowledged_at, resolved_at
            FROM escalation_events
            WHERE acknowledged_at IS NOT NULL OR resolved_at IS NOT NULL
        `);
        let totalEscalationHours = 0;
        let acknowledgedEscCount = 0;
        for (const esc of escalations) {
            const start = new Date(esc.triggered_at);
            const end = new Date(esc.acknowledged_at || esc.resolved_at);
            const diffHours = Math.max(0, (end - start) / 3600000);
            totalEscalationHours += diffHours;
            acknowledgedEscCount++;
        }
        const meanEscalationResponseTimeHours = acknowledgedEscCount > 0
            ? Number((totalEscalationHours / acknowledgedEscCount).toFixed(1))
            : 0;

        return {
            title: 'NIYAM Pilot Indicators (Mandated SIH26262 Performance Metrics)',
            calculatedAt: new Date().toISOString(),
            dataSource: 'Live SQLite DatabaseSync (aicte_approval.db)',
            baselineNotice: 'Pre-pilot baseline values are synthetic demonstration reference marks. Current values are computed from active database records.',
            indicators: [
                {
                    key: 'pending_by_stage',
                    name: 'Pending Applications by Stage',
                    value: pendingByStage,
                    definition: 'Count of unfinalized dossiers grouped by current workflow stage (SCRUTINY, RE_SCRUTINY, EVC, SAC_SHC, COMPETENT_DECISION)',
                    unit: 'dossiers per stage'
                },
                {
                    key: 'mean_submission_to_decision_time',
                    name: 'Mean Submission-to-Decision Time',
                    value: meanSubmissionToDecisionDays,
                    numerator: Number(totalDecisionDays.toFixed(1)),
                    denominator: validDecisionCount,
                    definition: 'Total elapsed days from initial intake timestamp to statutory order date divided by decided applications count (handles 0 denominator)',
                    unit: 'days'
                },
                {
                    key: 'overdue_actions_ratio',
                    name: 'Overdue Actions Ratio',
                    value: overdueActionsRatio,
                    percentage: Number((overdueActionsRatio * 100).toFixed(1)),
                    numerator: overdueActionsCount,
                    denominator: openActionsWithDueDates,
                    definition: 'Count of overdue active actions divided by total open actions with due dates (dossiers + undertakings)',
                    unit: 'ratio (0 to 1)'
                },
                {
                    key: 'mean_evc_request_to_schedule_time',
                    name: 'Mean EVC Request-to-Schedule Time',
                    value: meanEvcRequestToScheduleDays,
                    numerator: Number(totalEvcScheduleDays.toFixed(1)),
                    denominator: validEvcCount,
                    definition: 'Average days elapsed between initial EVC visit requisition and confirmation of committee roster',
                    unit: 'days'
                },
                {
                    key: 'on_time_evidence_submissions_ratio',
                    name: 'On-Time Evidence Submissions Ratio',
                    value: onTimeEvidenceSubmissionsRatio,
                    percentage: Number((onTimeEvidenceSubmissionsRatio * 100).toFixed(1)),
                    numerator: onTimeCount,
                    denominator: submissionsDueTotal,
                    definition: 'Compliance evidence submitted on or before statutory due date divided by total obligations due',
                    unit: 'ratio (0 to 1)'
                },
                {
                    key: 'document_expiry_alerts_generated',
                    name: 'Document Expiry Alerts Generated',
                    value: docExpiryAlertsGenerated,
                    definition: 'Cumulative persistent regulatory alerts generated for approaching expiry of land deeds, leases, and FDRs',
                    unit: 'alerts generated'
                },
                {
                    key: 'escalation_response_time',
                    name: 'Escalation Response Time',
                    value: meanEscalationResponseTimeHours,
                    numerator: Number(totalEscalationHours.toFixed(1)),
                    denominator: acknowledgedEscCount,
                    definition: 'Average hours elapsed from automated SLA breach trigger to officer acknowledgment or resolution',
                    unit: 'hours'
                }
            ]
        };
    }
}

module.exports = new ReportService();
