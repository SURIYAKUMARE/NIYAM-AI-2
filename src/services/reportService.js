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
}

module.exports = new ReportService();
