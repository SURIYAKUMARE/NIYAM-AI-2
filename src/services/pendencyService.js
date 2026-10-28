const db = require('../database/db');

class PendencyService {
    // Calculate precise ageing classification for an application
    classifyApplicationAgeing(app) {
        const now = new Date();
        const stageEntry = new Date(app.stage_entry_time);
        const submission = new Date(app.submission_date);
        const dueDate = new Date(app.processing_due_date);

        const totalDaysPending = Math.max(0, Math.floor((now - submission) / (1000 * 60 * 60 * 24)));
        const stageDays = Math.max(0, Math.floor((now - stageEntry) / (1000 * 60 * 60 * 24)));
        const daysRemaining = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));

        let classification = 'WITHIN_TIMELINE';
        if (app.is_on_hold) {
            classification = 'ON_AUTHORISED_HOLD';
        } else if (daysRemaining < 0) {
            classification = 'OVERDUE';
        } else if (daysRemaining === 0) {
            classification = 'DUE_TODAY';
        } else if (daysRemaining <= 3) {
            classification = 'APPROACHING_DEADLINE';
        }

        return {
            totalDaysPending,
            stageDays,
            daysRemaining,
            overdueDays: daysRemaining < 0 ? Math.abs(daysRemaining) : 0,
            classification
        };
    }

    // Get executive dashboard summary KPIs (Section 14)
    getExecutiveDashboardKPIs(filters = {}) {
        let whereClause = ' WHERE 1=1';
        const params = [];

        if (filters.academicYear) {
            whereClause += ' AND a.academic_year = ?';
            params.push(filters.academicYear);
        }
        if (filters.regionId) {
            whereClause += ' AND a.assigned_region_id = ?';
            params.push(filters.regionId);
        }
        if (filters.institutionType) {
            whereClause += ' AND i.institution_type = ?';
            params.push(filters.institutionType);
        }
        if (filters.category) {
            whereClause += ' AND i.category = ?';
            params.push(filters.category);
        }

        const totalApps = db.queryOne(`
            SELECT COUNT(*) as count FROM applications a
            JOIN institutions i ON a.institution_id = i.id
            ${whereClause}
        `, params).count;

        const underProcessing = db.queryOne(`
            SELECT COUNT(*) as count FROM applications a
            JOIN institutions i ON a.institution_id = i.id
            ${whereClause} AND a.current_stage NOT IN ('APPROVED', 'REJECTED')
        `, params).count;

        const pendingScrutiny = db.queryOne(`
            SELECT COUNT(*) as count FROM applications a
            JOIN institutions i ON a.institution_id = i.id
            ${whereClause} AND a.current_stage IN ('SCRUTINY', 'RE_SCRUTINY')
        `, params).count;

        const pendingEVC = db.queryOne(`
            SELECT COUNT(*) as count FROM applications a
            JOIN institutions i ON a.institution_id = i.id
            ${whereClause} AND a.current_stage = 'EVC'
        `, params).count;

        const awaitingSAC = db.queryOne(`
            SELECT COUNT(*) as count FROM applications a
            JOIN institutions i ON a.institution_id = i.id
            ${whereClause} AND a.current_stage = 'SAC_SHC'
        `, params).count;

        // Approaching deadline: remaining <= 3 days and >= 0 days
        const approachingDeadlines = db.queryOne(`
            SELECT COUNT(*) as count FROM applications a
            JOIN institutions i ON a.institution_id = i.id
            ${whereClause} AND a.current_stage NOT IN ('APPROVED', 'REJECTED')
            AND datetime(a.processing_due_date) >= datetime('now')
            AND datetime(a.processing_due_date) <= datetime('now', '+3 days')
        `, params).count;

        // Overdue applications: due date < now and not approved/rejected and not hold
        const overdueApplications = db.queryOne(`
            SELECT COUNT(*) as count FROM applications a
            JOIN institutions i ON a.institution_id = i.id
            ${whereClause} AND a.current_stage NOT IN ('APPROVED', 'REJECTED')
            AND a.is_on_hold = 0
            AND datetime(a.processing_due_date) < datetime('now')
        `, params).count;

        // Pending Compliance (open undertakings)
        let utkFilter = '';
        const utkParams = [];
        if (filters.regionId) {
            utkFilter = ' JOIN institutions inst ON u.institution_id = inst.id WHERE inst.region_id = ? AND ';
            utkParams.push(filters.regionId);
        } else {
            utkFilter = ' WHERE ';
        }
        const pendingCompliance = db.queryOne(`
            SELECT COUNT(*) as count FROM undertakings u
            ${utkFilter} u.status IN ('PENDING', 'UPCOMING', 'SUBMITTED', 'UNDER_VERIFICATION', 'DEFICIENCY_RAISED', 'RESUBMISSION_REQUIRED', 'OVERDUE')
        `, utkParams).count;

        // Expiring Documents (within next 60 days)
        let docFilter = '';
        const docParams = [];
        if (filters.regionId) {
            docFilter = ' JOIN institutions inst2 ON d.institution_id = inst2.id WHERE inst2.region_id = ? AND ';
            docParams.push(filters.regionId);
        } else {
            docFilter = ' WHERE ';
        }
        const expiringDocuments = db.queryOne(`
            SELECT COUNT(*) as count FROM documents d
            ${docFilter} d.expiry_date IS NOT NULL 
            AND datetime(d.expiry_date) >= datetime('now')
            AND datetime(d.expiry_date) <= datetime('now', '+60 days')
        `, docParams).count;

        // Escalated Cases (open escalation events)
        const escalatedCases = db.queryOne(`
            SELECT COUNT(DISTINCT application_id) as count 
            FROM escalation_events 
            WHERE status IN ('TRIGGERED', 'ACKNOWLEDGED', 'REASSIGNED')
        `).count;

        return {
            totalApplications: totalApps,
            underProcessing,
            pendingScrutiny,
            pendingEVC,
            awaitingSAC,
            approachingDeadlines,
            overdueApplications,
            pendingCompliance,
            expiringDocuments,
            escalatedCases,
            lastRefreshed: new Date().toISOString()
        };
    }

    // Get Analytics Visualisations Data (Region-wise, Stage-wise, Ageing buckets, Trends)
    getAnalytics(filters = {}) {
        // 1. Region-wise application distribution
        const regionDistribution = db.query(`
            SELECT r.code as region_code, r.name as region_name, 
                   COUNT(a.id) as total_applications,
                   SUM(CASE WHEN a.current_stage NOT IN ('APPROVED', 'REJECTED') THEN 1 ELSE 0 END) as active_applications,
                   SUM(CASE WHEN datetime(a.processing_due_date) < datetime('now') AND a.current_stage NOT IN ('APPROVED', 'REJECTED') THEN 1 ELSE 0 END) as overdue_applications
            FROM regions r
            LEFT JOIN applications a ON r.id = a.assigned_region_id
            GROUP BY r.id, r.code, r.name
            ORDER BY total_applications DESC
        `);

        // 2. Stage-wise pendency
        const stagePendency = db.query(`
            SELECT a.current_stage, 
                   COUNT(a.id) as count,
                   AVG((julianday('now') - julianday(a.stage_entry_time))) as avg_stage_days
            FROM applications a
            WHERE a.current_stage NOT IN ('APPROVED', 'REJECTED')
            GROUP BY a.current_stage
        `);

        // 3. Application Ageing Buckets (<15d, 15-30d, 31-60d, >60d)
        const apps = db.query(`
            SELECT id, submission_date, is_on_hold, current_stage 
            FROM applications 
            WHERE current_stage NOT IN ('APPROVED', 'REJECTED')
        `);

        const ageingBuckets = {
            '0-15 Days': 0,
            '16-30 Days': 0,
            '31-60 Days': 0,
            '> 60 Days': 0
        };

        const now = new Date();
        for (const app of apps) {
            const days = Math.floor((now - new Date(app.submission_date)) / (1000 * 60 * 60 * 24));
            if (days <= 15) ageingBuckets['0-15 Days']++;
            else if (days <= 30) ageingBuckets['16-30 Days']++;
            else if (days <= 60) ageingBuckets['31-60 Days']++;
            else ageingBuckets['> 60 Days']++;
        }

        // 4. Officer Workload Distribution
        const officerWorkload = db.query(`
            SELECT u.id as officer_id, u.full_name as officer_name, u.role_code, r.name as region_name,
                   COUNT(a.id) as assigned_cases,
                   SUM(CASE WHEN datetime(a.processing_due_date) < datetime('now') THEN 1 ELSE 0 END) as overdue_cases
            FROM users u
            LEFT JOIN applications a ON u.id = a.assigned_officer_id AND a.current_stage NOT IN ('APPROVED', 'REJECTED')
            LEFT JOIN regions r ON u.region_id = r.id
            WHERE u.role_code IN ('REGIONAL_OFFICER', 'SCRUTINY_MEMBER', 'EVC_COORDINATOR', 'COMPLIANCE_OFFICER')
            GROUP BY u.id, u.full_name, u.role_code, r.name
            ORDER BY assigned_cases DESC
        `);

        return {
            regionDistribution,
            stagePendency,
            ageingBuckets,
            officerWorkload
        };
    }

    // Get detailed application list with ageing calculation
    getDetailedPendencyList({
        regionId = null,
        stage = null,
        classification = null,
        limit = 50,
        offset = 0
    } = {}) {
        let sql = `
            SELECT a.*, i.name as institution_name, i.permanent_id, i.state, i.institution_type, i.category,
                   r.name as region_name, at.name as application_type_name,
                   u.full_name as assigned_officer_name
            FROM applications a
            JOIN institutions i ON a.institution_id = i.id
            JOIN regions r ON a.assigned_region_id = r.id
            JOIN application_types at ON a.application_type_code = at.code
            LEFT JOIN users u ON a.assigned_officer_id = u.id
            WHERE 1=1
        `;
        const params = [];
        if (regionId) {
            sql += ' AND a.assigned_region_id = ?';
            params.push(regionId);
        }
        if (stage) {
            sql += ' AND a.current_stage = ?';
            params.push(stage);
        }

        sql += ' ORDER BY a.processing_due_date ASC';
        const rawApps = db.query(sql, params);

        // Compute dynamic SLA ageing fields
        const calculatedApps = rawApps.map(app => {
            const ageing = this.classifyApplicationAgeing(app);
            return {
                ...app,
                ...ageing
            };
        });

        // Filter by classification if requested
        let filtered = calculatedApps;
        if (classification) {
            filtered = calculatedApps.filter(a => a.classification === classification);
        }

        return {
            total: filtered.length,
            applications: filtered.slice(offset, offset + limit)
        };
    }
}

module.exports = new PendencyService();
