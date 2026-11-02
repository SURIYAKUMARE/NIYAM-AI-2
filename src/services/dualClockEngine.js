const crypto = require('node:crypto');
const db = require('../database/db');
const auditService = require('./auditService');

/**
 * DUAL-CLOCK ACCOUNTABILITY ENGINE
 * 
 * Mathematically separates:
 * 1. COLLEGE DELAY CLOCK: Time elapsed while action was pending with the Institution
 * 2. OFFICER PROCESSING CLOCK: Time elapsed while action was pending with AICTE Officers
 * 
 * Guaranteed Invariant: No overlapping intervals. Total active time = College Time + Officer Time.
 */
class DualClockEngine {
    constructor() {
        this.CLOCK_TYPES = {
            COLLEGE_DELAY: 'COLLEGE_DELAY',
            OFFICER_PROCESSING: 'OFFICER_PROCESSING',
            REGULATORY_HOLD: 'REGULATORY_HOLD'
        };

        // Mapping of workflow stages to default accountable entity
        this.STAGE_CLOCK_MAP = {
            'APPLICATION_SUBMISSION': 'COLLEGE_DELAY',
            'SUBMITTED': 'OFFICER_PROCESSING',
            'INITIAL_DOCUMENT_VALIDATION': 'OFFICER_PROCESSING',
            'SCRUTINY_OFFICER_ASSIGNMENT': 'OFFICER_PROCESSING',
            'SCRUTINY': 'OFFICER_PROCESSING',
            'DOCUMENT_DEFICIENCY_NOTIFICATION': 'COLLEGE_DELAY',
            'COLLEGE_RESPONSE': 'COLLEGE_DELAY',
            'RE_SCRUTINY': 'OFFICER_PROCESSING',
            'REVERIFICATION': 'OFFICER_PROCESSING',
            'EVC_SCHEDULING': 'OFFICER_PROCESSING',
            'EVC': 'OFFICER_PROCESSING',
            'PHYSICAL_INSPECTION': 'OFFICER_PROCESSING',
            'INSPECTION_REPORT': 'OFFICER_PROCESSING',
            'REGIONAL_OFFICE_REVIEW': 'OFFICER_PROCESSING',
            'SAC_SHC': 'OFFICER_PROCESSING',
            'SENIOR_OFFICER_REVIEW': 'OFFICER_PROCESSING',
            'COMPETENT_DECISION': 'OFFICER_PROCESSING',
            'FINAL_DECISION': 'OFFICER_PROCESSING',
            'AUDIT_RECORD_GENERATION': 'OFFICER_PROCESSING',
            'APPROVED': 'OFFICER_PROCESSING',
            'REJECTED': 'OFFICER_PROCESSING'
        };
    }

    /**
     * Get current effective timestamp (respects time-travel simulation clock if active)
     */
    getCurrentTime() {
        try {
            const sim = db.queryOne('SELECT * FROM simulation_clock WHERE id = 1 AND is_simulation_active = 1');
            if (sim && sim.virtual_time_offset_seconds) {
                const now = new Date();
                now.setSeconds(now.getSeconds() + sim.virtual_time_offset_seconds);
                return now.toISOString();
            }
        } catch (_) {}
        return new Date().toISOString();
    }

    /**
     * Switch active clock for an application
     */
    switchClock({ applicationId, toClockType, stageName, responsibleEntityType, actorId = null, reason = '' }) {
        return db.transaction((tx) => {
            const app = tx.queryOne('SELECT * FROM applications WHERE id = ?', [applicationId]);
            if (!app) throw new Error(`Application ${applicationId} not found.`);

            const now = this.getCurrentTime();
            const currentClock = app.active_clock || this.CLOCK_TYPES.OFFICER_PROCESSING;

            // If already on this clock, nothing to switch
            if (currentClock === toClockType) {
                return { applicationId, activeClock: toClockType, switched: false };
            }

            // 1. Close active ledger entry if exists
            const activeEntry = tx.queryOne(`
                SELECT * FROM dual_clock_ledger 
                WHERE application_id = ? AND end_time IS NULL 
                ORDER BY start_time DESC LIMIT 1
            `, [applicationId]);

            if (activeEntry) {
                const startMs = new Date(activeEntry.start_time).getTime();
                const endMs = new Date(now).getTime();
                const durationSec = Math.max(0, Math.floor((endMs - startMs) / 1000));

                tx.execute(`
                    UPDATE dual_clock_ledger 
                    SET end_time = ?, duration_seconds = ?
                    WHERE id = ?
                `, [now, durationSec, activeEntry.id]);

                // Accumulate onto master application counters
                if (activeEntry.clock_type === this.CLOCK_TYPES.COLLEGE_DELAY) {
                    tx.execute(`
                        UPDATE applications 
                        SET college_delay_seconds = COALESCE(college_delay_seconds, 0) + ? 
                        WHERE id = ?
                    `, [durationSec, applicationId]);
                } else if (activeEntry.clock_type === this.CLOCK_TYPES.OFFICER_PROCESSING) {
                    tx.execute(`
                        UPDATE applications 
                        SET officer_processing_seconds = COALESCE(officer_processing_seconds, 0) + ? 
                        WHERE id = ?
                    `, [durationSec, applicationId]);
                }
            }

            // 2. Open new ledger entry
            const newEntryId = crypto.randomUUID();
            tx.execute(`
                INSERT INTO dual_clock_ledger (
                    id, application_id, clock_type, start_time, stage_name, 
                    responsible_entity_type, responsible_actor_id, reason_for_clock, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                newEntryId,
                applicationId,
                toClockType,
                now,
                stageName || app.current_stage,
                responsibleEntityType || (toClockType === this.CLOCK_TYPES.COLLEGE_DELAY ? 'INSTITUTION' : 'AICTE_OFFICER'),
                actorId,
                reason || `Clock switched to ${toClockType}`,
                now
            ]);

            // 3. Update application master record
            tx.execute(`
                UPDATE applications 
                SET active_clock = ?, last_clock_switch_at = ? 
                WHERE id = ?
            `, [toClockType, now, applicationId]);

            return {
                applicationId,
                previousClock: currentClock,
                activeClock: toClockType,
                switchedAt: now,
                switched: true
            };
        });
    }

    /**
     * Compute real-time dual-clock telemetry for an application
     */
    getDualClockMetrics(applicationId) {
        const app = db.queryOne(`
            SELECT a.*, i.name as institution_name, i.permanent_id, r.name as region_name, r.code as region_code
            FROM applications a
            JOIN institutions i ON a.institution_id = i.id
            JOIN regions r ON a.assigned_region_id = r.id
            WHERE a.id = ?
        `, [applicationId]);

        if (!app) throw new Error(`Application ${applicationId} not found.`);

        const now = this.getCurrentTime();
        const nowMs = new Date(now).getTime();

        // 1. Fetch closed ledger durations
        const closedTotals = db.query(`
            SELECT clock_type, SUM(duration_seconds) as total_seconds, COUNT(*) as slice_count
            FROM dual_clock_ledger
            WHERE application_id = ? AND end_time IS NOT NULL
            GROUP BY clock_type
        `, [applicationId]);

        let collegeSeconds = 0;
        let officerSeconds = 0;

        for (const row of closedTotals) {
            if (row.clock_type === this.CLOCK_TYPES.COLLEGE_DELAY) collegeSeconds = Number(row.total_seconds) || 0;
            if (row.clock_type === this.CLOCK_TYPES.OFFICER_PROCESSING) officerSeconds = Number(row.total_seconds) || 0;
        }

        // 2. Add currently active slice
        const activeSlice = db.queryOne(`
            SELECT * FROM dual_clock_ledger 
            WHERE application_id = ? AND end_time IS NULL 
            ORDER BY start_time DESC LIMIT 1
        `, [applicationId]);

        let activeSliceDuration = 0;
        if (activeSlice) {
            const startMs = new Date(activeSlice.start_time).getTime();
            activeSliceDuration = Math.max(0, Math.floor((nowMs - startMs) / 1000));

            if (activeSlice.clock_type === this.CLOCK_TYPES.COLLEGE_DELAY) {
                collegeSeconds += activeSliceDuration;
            } else if (activeSlice.clock_type === this.CLOCK_TYPES.OFFICER_PROCESSING) {
                officerSeconds += activeSliceDuration;
            }
        } else {
            // Fallback: If no slice open yet, initialize based on stage entry
            const stageEntryMs = new Date(app.stage_entry_time || app.submission_date || now).getTime();
            const elapsed = Math.max(0, Math.floor((nowMs - stageEntryMs) / 1000));
            const defaultClock = this.STAGE_CLOCK_MAP[app.current_stage] || this.CLOCK_TYPES.OFFICER_PROCESSING;
            if (defaultClock === this.CLOCK_TYPES.COLLEGE_DELAY) {
                collegeSeconds += elapsed;
            } else {
                officerSeconds += elapsed;
            }
        }

        const totalActiveSeconds = collegeSeconds + officerSeconds;
        const collegeHours = (collegeSeconds / 3600).toFixed(1);
        const officerHours = (officerSeconds / 3600).toFixed(1);
        const totalHours = (totalActiveSeconds / 3600).toFixed(1);

        const collegePercentage = totalActiveSeconds > 0 ? Math.round((collegeSeconds / totalActiveSeconds) * 100) : 0;
        const officerPercentage = totalActiveSeconds > 0 ? Math.round((officerSeconds / totalActiveSeconds) * 100) : 0;

        // 3. Stage-by-stage dual clock audit history
        const stageHistory = db.query(`
            SELECT stage_name, clock_type, responsible_entity_type, 
                   start_time, end_time, duration_seconds, reason_for_clock
            FROM dual_clock_ledger
            WHERE application_id = ?
            ORDER BY start_time ASC
        `, [applicationId]);

        // 4. SLA comparison
        const dueMs = new Date(app.processing_due_date).getTime();
        const isOverdue = nowMs > dueMs && !['APPROVED', 'REJECTED'].includes(app.current_stage);
        const overdueSeconds = isOverdue ? Math.floor((nowMs - dueMs) / 1000) : 0;
        const overdueHours = (overdueSeconds / 3600).toFixed(1);

        // Accountability diagnosis: Who caused the delay?
        let accountabilityDiagnosis = 'WITHIN_SLA';
        if (isOverdue) {
            if (collegePercentage > 60) {
                accountabilityDiagnosis = 'COLLEGE_RESPONSIBLE_DELAY';
            } else if (officerPercentage > 60) {
                accountabilityDiagnosis = 'OFFICER_PROCESSING_BOTTLENECK';
            } else {
                accountabilityDiagnosis = 'SHARED_PROCEDURAL_OVERRUN';
            }
        }

        return {
            applicationId: app.id,
            applicationNo: app.application_no,
            institutionName: app.institution_name,
            currentStage: app.current_stage,
            currentStatus: app.current_status,
            activeClock: app.active_clock || (activeSlice ? activeSlice.clock_type : this.CLOCK_TYPES.OFFICER_PROCESSING),
            currentTime: now,
            clocks: {
                collegeDelay: {
                    totalSeconds: collegeSeconds,
                    totalHours: parseFloat(collegeHours),
                    totalDays: (collegeSeconds / 86400).toFixed(2),
                    percentage: collegePercentage,
                    label: 'College Delay Clock (Deficiencies, Submissions & Proofs)'
                },
                officerProcessing: {
                    totalSeconds: officerSeconds,
                    totalHours: parseFloat(officerHours),
                    totalDays: (officerSeconds / 86400).toFixed(2),
                    percentage: officerPercentage,
                    label: 'Officer Processing Clock (Scrutiny, EVC, Reviews & Orders)'
                },
                totalActive: {
                    totalSeconds: totalActiveSeconds,
                    totalHours: parseFloat(totalHours),
                    totalDays: (totalActiveSeconds / 86400).toFixed(2)
                }
            },
            slaStatus: {
                processingDueDate: app.processing_due_date,
                isOverdue,
                overdueHours: parseFloat(overdueHours),
                accountabilityDiagnosis,
                diagnosisExplanation: this.getDiagnosisExplanation(accountabilityDiagnosis, collegePercentage, officerPercentage, overdueHours)
            },
            slicesCount: stageHistory.length + (activeSlice ? 1 : 0),
            stageHistory
        };
    }

    getDiagnosisExplanation(diagnosis, collegePct, officerPct, overdueHours) {
        switch (diagnosis) {
            case 'COLLEGE_RESPONSIBLE_DELAY':
                return `Application exceeded SLA due primarily to institutional delays (${collegePct}% of total duration spent responding to deficiencies or submitting proof). Officer processing remained compliant.`;
            case 'OFFICER_PROCESSING_BOTTLENECK':
                return `Application exceeded SLA due to regulatory review delays (${officerPct}% of total duration spent in scrutiny, committee scheduling, or sanction queues).`;
            case 'SHARED_PROCEDURAL_OVERRUN':
                return `Application SLA breach resulted from cumulative back-and-forth iterations between college deficiency rectifications and committee reverifications.`;
            default:
                return 'Application is progressing within established statutory Approval Process Handbook SLAs.';
        }
    }

    /**
     * Compute Regional Dual-Clock Accountability Performance Index
     */
    getRegionalAccountabilityPerformance() {
        const regions = db.query('SELECT * FROM regions ORDER BY code ASC');
        const results = [];

        for (const reg of regions) {
            const apps = db.query(`
                SELECT id, college_delay_seconds, officer_processing_seconds, current_stage, current_status, processing_due_date
                FROM applications
                WHERE assigned_region_id = ?
            `, [reg.id]);

            let totalCollegeSec = 0;
            let totalOfficerSec = 0;
            let totalSlaBreaches = 0;
            const nowMs = new Date(this.getCurrentTime()).getTime();

            for (const a of apps) {
                totalCollegeSec += (a.college_delay_seconds || 0);
                totalOfficerSec += (a.officer_processing_seconds || 0);
                if (new Date(a.processing_due_date).getTime() < nowMs && !['APPROVED', 'REJECTED'].includes(a.current_stage)) {
                    totalSlaBreaches++;
                }
            }

            const appCount = apps.length || 1;
            const avgCollegeDays = (totalCollegeSec / appCount / 86400).toFixed(1);
            const avgOfficerDays = (totalOfficerSec / appCount / 86400).toFixed(1);
            const totalAvgDays = ((totalCollegeSec + totalOfficerSec) / appCount / 86400).toFixed(1);

            results.push({
                regionId: reg.id,
                regionCode: reg.code,
                regionName: reg.name,
                headquarter: reg.headquarter,
                totalApplications: apps.length,
                slaBreaches: totalSlaBreaches,
                avgCollegeDelayDays: parseFloat(avgCollegeDays),
                avgOfficerProcessingDays: parseFloat(avgOfficerDays),
                avgTotalTurnaroundDays: parseFloat(totalAvgDays),
                officerEfficiencyIndex: parseFloat(totalAvgDays) > 0 
                    ? Math.round((1 - (parseFloat(avgOfficerDays) / (parseFloat(totalAvgDays) || 1))) * 100) 
                    : 100
            });
        }

        return results;
    }
}

module.exports = new DualClockEngine();
